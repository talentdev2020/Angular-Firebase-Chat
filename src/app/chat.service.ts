import { Injectable, EventEmitter, DefaultIterableDiffer } from '@angular/core';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { GroupMessage, User, Group } from './chat/interface';
import prodcue, { produce } from 'immer';
import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';
import { AngularFirestore } from '@angular/fire/firestore';
import { isSyntaxError, identifierModuleUrl } from '@angular/compiler';
@Injectable({
  providedIn: 'root',
})
export class ChatService {
  students: User[] = []; // all users in the group
  group: Group; // current group
  role: number; // is student or professional
  currentGroupUser: User;
  groupRef;
  isUpdated: boolean;
  grouplist: Group[] = []; // all groups
  usersRef;
  userlist: User[] = []; // all registered users
  groupMessage: GroupMessage; // current group information
  currentuserid: string; // current user uid
  currentStudents: User[] = []; //users in 1:1 chat
  inactiveStudents: User[] = []; // hided users in 1:1 chat
  groupListChanged$ = new BehaviorSubject<Group[]>([]);
  groupMessageChanged$ = new BehaviorSubject<GroupMessage>({
    uid: '',
    messages: [],
  });
  userListChanged$ = new BehaviorSubject<User[]>([]);
  isReadChanged$ = new BehaviorSubject<{ uid: string; isRead: boolean }>({
    uid: '',
    isRead: false,
  });
  currentStudentsChanged$ = new BehaviorSubject<User[]>([]);
  studentsChanged$ = new BehaviorSubject<User[]>([]);
  inactiveStudentsChanged$ = new BehaviorSubject<User[]>([]);
  currentUserIdChanged$ = new BehaviorSubject<string>('');

  constructor(
    private db: AngularFireDatabase,
    private firestore: AngularFirestore
  ) {
    this.groupRef = firestore.collection('grouplist');
    this.usersRef = firestore.collection('userlist');

    this.role = 0;
    this.userlist = [];
    this.getGroupList();
    this.getUserList();
  }

  /**
   * add new user
   * @param id
   */
  addStudent(id) {
    const arr = this.userlist.filter((user) => user.id === id);
    arr[0].isMin = false;
    this.students.unshift(arr[0]);
  }

  /**
   * set the time zone by the timezone variable of the group
   * @param messages
   */
  changeTime(messages) {
    const obj = this;

    const now = new Date().getTime();
    let tmp_messages = messages.filter(
      (message) => now - message.time <= this.group.limittime * 60000
    );
    tmp_messages = tmp_messages.map((message) => {
      const time = message.time + 1000 * 3600 * obj.group.timezone;
      const date = new Date(time);
      const newtime =
        date.getUTCDate() +
        ' ' +
        date.getUTCHours() +
        ':' +
        date.getUTCMinutes() +
        ':' +
        date.getUTCSeconds();

      return produce(message, (draft) => {
        draft.time = newtime;
      });
    });

    return tmp_messages;
  }

  /**
   * add the user to the 1:1 chat
   * @param uid
   */
  addCurrentStudent(uid) {
    const tmp = this.currentStudents.filter((student) => student.uid === uid);
    if (tmp.length === 0) {
      // if (this.currentUser.messages.length === 0)
      //   this.currentUser.messages = [];

      const arr = this.userlist.filter((user) => user.uid == uid);
      const userobj = this.usersRef.doc(uid);
      userobj.snapshotChanges().subscribe((user) => {
        const tmp = this.currentStudents.filter(
          (student) => student.uid === uid
        );
        if (tmp.length > 0) return;

        const data = user.payload.data() as User;

        // if (data.messages.length == 0) data.messages = [];

        data.messages = data.messages.filter(
          (message) => message.sender === uid || message.receiver === uid
        );

        data.isMin = false;
        data.messages = this.changeTime(data.messages);
        data.uid = uid;

        this.currentStudents.unshift(data);

        this.currentStudentsChanged$.next(this.currentStudents);
      });
    }

    // if there are more than 4 users, hide others in 1:1 chat
    let count = 0;
    if (this.currentStudents.length > 4) {
      const tmp = this.currentStudents[this.currentStudents.length - 1];
      this.currentStudents.pop();
      this.inactiveStudents.unshift(tmp);
    } else {
      this.currentStudents.map((student) => {
        if (!student.isMin) count++;
      });
      if (this.currentStudents.length > 3)
        if (count >= 2) {
          const tmp = this.currentStudents[this.currentStudents.length - 1];

          this.currentStudents.pop();
          this.inactiveStudents.unshift(tmp);
        }
    }
    this.inactiveStudents = this.inactiveStudents.filter(
      (student) => student.uid !== uid
    );
    this.inactiveStudentsChanged$.next(this.inactiveStudents);
  }

  /**
   * remove the user from the 1:1 chat
   * @param id
   */
  removeStudent(id) {
    this.currentStudents = this.currentStudents.filter(
      (student) => student.id !== id
    );
    if (this.inactiveStudents.length > 0) {
      let tmp = this.inactiveStudents[0];
      tmp.isMin = true;
      this.currentStudents.push(tmp);
      this.inactiveStudents.shift();
      this.inactiveStudentsChanged$.next(this.inactiveStudents);
    }

    this.currentStudentsChanged$.next(this.currentStudents);
  }

  /**
   * show the 1:1 chat from hided user in 1:1 chat.
   * @param id
   */
  activeStudent(id) {
    let index = 0;
    let tmp;
    this.students.map((student, i) => {
      if (student.id === id) {
        tmp = student;
        index = i;
      }
      return student;
    });
    this.students.splice(index, 1);
    this.students.unshift(tmp);
  }

  /**
   * Minimize or Maximize the user in 1:1 chat
   * @param id
   */
  changeState(id) {
    this.currentStudents = this.currentStudents.map((student) => {
      if (student.id === id) student.isMin = !student.isMin;
      return student;
    });
  }

  /**
   * get the all users in the group
   */
  async getStudents() {
    let flag = 0;
    const obj = await this.groupRef.doc(this.group.id);
    obj.snapshotChanges().subscribe((group) => {
      const data = group.payload.data() as Group;

      if (!data) return;
      const users = data.users;

      let arr = this.userlist.filter((user) => users.includes(user.uid));

      arr = arr.filter((user) => user.uid !== this.currentuserid);

      this.students = arr;
      this.studentsChanged$.next(this.students);
    });

    const currentUserObj = await this.usersRef.doc(this.currentuserid);
    currentUserObj.snapshotChanges().subscribe((user) => {
      const data = user.payload.data() as User;

      if (data.messages.length === 0) return;

      const message = data.messages[data.messages.length - 1];

      if (message.isRead === false && message.sender !== this.currentuserid) {
        if (flag !== 0) this.addCurrentStudent(message.sender);
        flag = 1;
      }
    });
  }

  /**
   * format the time
   */
  getFullTime(): number {
    const today = new Date();

    return today.getTime();
  }

  /**
   * get the all groups
   */

  getGroupList() {
    this.groupRef.snapshotChanges().subscribe((list) => {
      //this.grouplist = [];
      this.grouplist = list.map((group) => {
        const data = group.payload.doc.data();
        const tmp = { ...data, id: group.payload.doc.id };
        //this.grouplist.push(tmp);

        return tmp;
      });
      this.groupListChanged$.next(this.grouplist);
    });
  }

  /**
   * create new group
   * @param name group name which user is going to create
   * @param limit timelimit for the group
   * @param timezone timezone for the group
   */
  async createGroup(name, limit, timezone) {
    const res = await this.firestore.collection('groupmessages').add({});
    this.groupRef.add({
      name,
      owner: 'test',
      users: [],
      limittime: limit,
      timezone: timezone,
      messageid: res.id,
    });
  }

  /**
   * get all users
   */
  getUserList() {
    this.usersRef.snapshotChanges().subscribe((list) => {
      // if (this.userlist.length > 0) return;
      this.userlist = list.map((user) => {
        return { uid: user.payload.doc.id, ...user.payload.doc.data() };
      });

      this.userListChanged$.next(this.userlist);
    });
  }

  /**
   * add new user
   * @param id
   * @param name
   * @param groupid
   */
  async addUser(id, name, groupid) {
    const arr = this.userlist.filter((user) => user.id === id);
    const group = this.grouplist.filter((group) => group.id === groupid);

    this.group = { ...group[0] };

    const obj = await this.groupRef.doc(groupid);

    if (!group[0].users) group[0].users = [];
    if (arr.length === 0) {
      const res = await this.usersRef.add({ id, name, messages: [] });

      this.currentuserid = res.id;

      delete group[0].id;
      group[0].users.push(res.id);

      obj.set(group[0]);
    } else {
      this.currentuserid = arr[0].uid;

      if (!group[0].users.includes(arr[0].uid)) {
        group[0].users.push(arr[0].uid);

        obj.set(group[0]);
      }
    }

    if (this.currentuserid) {
      const obj = this.usersRef.doc(this.currentuserid);

      obj.snapshotChanges().subscribe((user) => {
        const temp_user = user.payload.data() as User;
        // if (this.currentUser.messages.length === 0)
        //   this.currentUser.messages = [];
        this.currentStudents = this.currentStudents.map((student) => {
          student.messages = temp_user.messages.filter(
            (message) =>
              message.receiver === student.uid || message.sender === student.uid
          );
          student.messages = this.changeTime(student.messages);
          return student;
        });

        this.currentStudentsChanged$.next(this.currentStudents);

        this.currentUserIdChanged$.next(this.currentuserid);
      });

      // this.getStudents();
    }

    const groupobj = this.firestore
      .collection('groupmessages')
      .doc(this.group.messageid);
    // const tmp_this = this;
    groupobj.snapshotChanges().subscribe((groupmessage) => {
      const data = groupmessage.payload.data() as GroupMessage;
      this.groupMessage = { ...data };
      this.groupMessageChanged$.next(this.groupMessage);
    });
    this.getStudents();
  }

  /**
   * send message in 1:1 chat
   * @param receiverid
   * @param message
   */
  async sendMessage(receiverid, message) {
    const senderobj = await this.usersRef.doc(this.currentuserid);
    const sender = this.userlist.filter(
      (user) => user.uid === this.currentuserid
    );
    const receiver = this.userlist.filter((user) => user.uid === receiverid);
    // if (!sender[0].messages) sender[0].messages = [];
    const tmp_data = {
      sender: this.currentuserid,
      receiver: receiverid,
      content: message,
      time: this.getFullTime(),
      isRead: true,
    };

    sender[0].messages.push(tmp_data);
    senderobj.set(sender[0]);
    const receiveobj = await this.usersRef.doc(receiverid);
    // if (!receiver[0].messages) receiver[0].messages = [];
    tmp_data.isRead = false;

    receiver[0].messages.push(tmp_data);
    receiveobj.set(receiver[0]);
  }

  /**
   * remove the unread message of the user
   * @param receiver
   * @param flag the status if user click the left panel or message input box in 1:1chat. If flag =0, it means user clicked the leftpanel
   */
  async setReadMessage(receiver, flag = 0) {
    if (flag === 1) {
      this.isReadChanged$.next({ uid: receiver, isRead: true });
    }
    this.isUpdated = true;
    const senderobj = await this.usersRef.doc(this.currentuserid);

    const sender = this.userlist.filter(
      (user) => user.uid === this.currentuserid
    );
    senderobj.snapshotChanges().subscribe((sender) => {
      if (!this.isUpdated) return;
      const data = sender.payload.data() as User;
      // if (data.messages.length === 0) data.messages = [];
      data.messages = data.messages.map((message) => {
        if (message.sender === receiver) {
          message.isRead = true;
        }
        return message;
      });

      senderobj.set(data);
      this.isUpdated = false;
    });
  }

  /**
   * send message to the group
   * @param content
   */
  async sendGroupMessage(content) {
    const groupobj = await this.firestore
      .collection('groupmessages')
      .doc(this.group.messageid);

    // if (this.groupMessage.messages.length === 0)
    //   this.groupMessage.messages = [];
    // if (!this.groupMessage.groupid) {
    //   this.groupMessage.groupid = this.group.id;
    // }
    this.groupMessage.messages.push({
      sender: this.currentuserid,
      message: content,
      time: this.getFullTime(),
      name: '',
    });
    groupobj.set(this.groupMessage);
  }
  setRole(role) {
    this.role = role;
  }
}
