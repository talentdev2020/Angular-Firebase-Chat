import { ChatService } from './../chat.service';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { User, Group, GroupMessage } from './interface';

import { createOfflineCompileUrlResolver } from '@angular/compiler';
@Component({
  selector: 'main-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})

/*
This component is for the main page which includes left panel, group chat and 1:1 chat
*/
export class ChatComponent implements OnInit {
  students: User[]; // All registered users in the current group. This will be showed in left panel.
  userlist: User[]; // All registered users
  currentuid: string; // current user uid
  currentStudents: User[]; // current user
  groupmessage: string; // the current group message. This is binded to the group message element in Frontend
  groupMessage: GroupMessage; // All messages in the current group
  groupname: string; // current group name
  limittime: number; //  User can see the messages within this limittime(minutes).  This is set when crerating the group
  timezone: number; // Timezone for the Group. All users will work on this time zone. This is set when creating the group.
  inactiveStudents: User[]; //   Hided users in 1:1 chat. If there are more than 4 users in 1:1 chat, others will be hided and it will be added to this variable.
  unreadMessages: number[]; // the number of unread messages for all users in left panel.
  userid: string; // current userid
  role: number; // the role for Student or Professional
  group_id: string; //current group uid
  groupList: Group[]; // all group list
  username: string; // current user name
  input_userid: string; // current userid, this is binded to the userid element in Frontend.
  @ViewChild('message_group') groupRef: ElementRef;
  @ViewChild('messageRef') messageRef: ElementRef;
  isList: boolean; // for popup of student list
  isListIcon: boolean; // for list icon of students

  /* Initialize the variables */
  constructor(private chatService: ChatService) {
    this.isList = false;
    this.isListIcon = false;
    this.unreadMessages = [];
    this.username = '';
    this.group_id = '';
    this.userid = '';
    this.groupname = '';
    this.limittime = 10;
    this.timezone = 0;
  }

  ngOnInit(): void {
    this.getUserList();
    this.getGroupList();

    this.chatService.currentUserIdChanged$.subscribe((userid) => {
      this.currentuid = userid;
      this.getStudents();
      this.getCurrentStudents();
      this.getInactiveStudents();
    });
    this.role = this.chatService.role;
  }

  /* 
    get all users in the current group
  */
  getStudents() {
    this.chatService.studentsChanged$.subscribe((students) => {
      this.students = students;

      const arr = this.userlist.filter((user) => user.id === this.userid);

      // get the unread message for each user.
      students.map((student, index) => {
        if (!arr[0].messages) this.unreadMessages[index] = 0;
        else {
          const len = arr[0].messages.filter(
            (message) =>
              message.receiver === this.currentuid &&
              message.sender === student.uid &&
              message.isRead === false
          );

          this.unreadMessages[index] = len.length;
        }
      });
    });

    let readIndex = 0;

    // when user read the unread messages, initialize the unreadmessage number of the current user.
    this.chatService.isReadChanged$.subscribe((change) => {
      if (!change.uid || !change.isRead) return;

      this.students.map((student, index) => {
        if (student.uid === change.uid) readIndex = index;
        return student;
      });
      this.unreadMessages[readIndex] = 0;
    });
  }

  /*
    get the list of users who is currently showing chatbox
  */
  getCurrentStudents() {
    const obj = this;

    // when the user send or receive the message, update the currentStudents variable
    this.chatService.currentStudentsChanged$.subscribe((currentStudents) => {
      this.currentStudents = currentStudents.map((student) => {
        let tmp = student;
        // if (!tmp.messages) tmp.messages = [];
        tmp.messages = tmp.messages.map((message) => {
          const arr = obj.userlist.filter(
            (user) => user.uid === message.sender
          );

          return { ...message, receivername: arr[0].name };
        });

        this.currentuid = this.chatService.currentuserid;

        if (!this.currentuid) return tmp;
        tmp.messages = tmp.messages.filter((message) => {
          if (
            (message.sender === student.uid &&
              message.receiver === this.currentuid) ||
            (message.sender === this.currentuid &&
              message.receiver === student.uid)
          )
            return true;
          else return false;
        });
        return tmp;
      });
    });
  }

  /* 
    get the list of all users
  */
  getUserList() {
    this.chatService.userListChanged$.subscribe((userlist) => {
      this.userlist = [...userlist];
    });
  }

  /*
    get the list of students who is not showing 1:1chatbox
  */
  getInactiveStudents() {
    this.chatService.inactiveStudentsChanged$.subscribe((inactiveStudents) => {
      if (inactiveStudents.length >= 1) this.isListIcon = true;
      else this.isListIcon = false;
      this.inactiveStudents = inactiveStudents;
    });
  }

  /* 
    Show the popup for hided users in 1:1 Chat.
    If there are more than 4 users in 1:1 chat, others will be hided.
    This will show these hided users or not.
     
  */
  showList() {
    this.isList = !this.isList;
  }

  /*
    Add the user to the 1:1chat list.
    
  */
  addCurrentStudent(uid, name) {
    this.chatService.addCurrentStudent(uid);
    this.students.map((student, index) => {
      if (student.uid === uid) this.unreadMessages[index] = 0;
    });
    this.chatService.setReadMessage(uid);
  }

  /* 
    This is called when clicking the Joining button in the second page.
  */
  onJoin() {
    const tmp_this = this;
    if (this.input_userid === '') alert('Please inupt user ID');
    else if (this.username === '') alert('Please input user name');
    else if (this.group_id === '') alert('Please input group id');
    else {
      this.userid = this.input_userid;
      this.chatService.addUser(this.userid, this.username, this.group_id);

      this.chatService.groupMessageChanged$.subscribe((groupmessage) => {
        this.groupMessage = { ...groupmessage };
        //if (!this.groupMessage.messages) this.groupMessage.messages = [];

        this.groupMessage.messages = this.chatService.changeTime(
          this.groupMessage.messages
        );
        this.groupMessage.messages = this.groupMessage.messages.map(
          (message) => {
            const arr = this.userlist.filter(
              (user) => user.uid === message.sender
            );

            const name = arr[0].name;
            return { ...message, name: name };
          }
        );
        if (tmp_this.groupRef)
          setTimeout(() => {
            tmp_this.groupRef.nativeElement.scrollTop =
              tmp_this.groupRef.nativeElement.scrollHeight;
          }, 500);
      });

      this.currentuid = this.chatService.currentuserid;
    }
  }

  /*
    get all grop list
   */
  getGroupList() {
    this.chatService.groupListChanged$.subscribe((grouplist) => {
      this.groupList = grouplist;
    });
  }

  /**
   *
   * @param group_id
   * get the current group information
   */
  onSelectGroup(group_id) {
    this.group_id = group_id;
    this.groupList.map((group) => {
      if (group.id === this.group_id) {
        document.getElementById(group_id).className = 'selected';
      } else document.getElementById(group.id).className = '';
      return group;
    });
  }
  /**
   * Create the new group
   */
  onCreateGroup() {
    const arr = this.groupList.map((item) => {
      return item.name;
    });
    if (!this.groupname) {
      alert('Please input group name');
      return;
    }
    if (arr.includes(this.groupname))
      alert('This group name is already exist.');
    else
      this.chatService.createGroup(
        this.groupname,
        this.limittime,
        this.timezone
      );
  }

  /**
   * send the message to the Group
   */
  sendGroupMessage() {
    if (!this.groupmessage) return;
    this.chatService.sendGroupMessage(this.groupmessage);

    this.groupmessage = '';
  }
}
