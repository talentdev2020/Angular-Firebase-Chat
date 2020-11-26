import { Component, OnInit } from '@angular/core';
import { ChatService } from './../chat.service';
@Component({
  selector: 'app-root',
  templateUrl: './login-chat.component.html',
  styleUrls: ['./login-chat.component.css'],
})

/*
Thsi is the first page which use can select Professional or Student
*/
export class LoginChatComponent implements OnInit {
  role: number;
  isNextPage: boolean;
  constructor(private chatService: ChatService) {
    this.role = 0;
    this.isNextPage = false;
  }

  ngOnInit(): void {}
  onRole(role) {
    this.role = role;
    this.chatService.setRole(role);
  }
  onNext() {
    this.isNextPage = true;
  }
}
