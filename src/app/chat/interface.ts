interface GroupMessage {
  messages: {
    sender: string;
    message: string;
    time: number;
    name: string;
  }[];
  uid: string;
}
interface Group {
  name: string;
  id: string;
  users: string[];
  owner: string;
  timezone: number;
  limittime: number;
  messageid: string;
}
type Message = {
  sender: string;
  receiver: string;
  time: number;
  content: string;
  isRead: boolean;
};
interface User {
  uid: string;
  name: string;
  id: string;
  messages: Message[];
  isMin: boolean;
}

export { GroupMessage, Group, User };
