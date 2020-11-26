import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  AfterViewInit,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { User } from '../chat/interface';
import { ChatService } from './../chat.service';
import { UploadService } from '../upload.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { HttpEventType, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-chat',
  templateUrl: './uchat.component.html',
  styleUrls: ['./uchat.component.css'],
})

/**
 * This component is for 1:1 chat
 */
export class UchatComponent implements OnInit, AfterViewInit {
  message = ''; //inputbox for message.  This is bined to the message element in Frontend
  filename: string; //for file upload
  firstIndex: number; // the position of unread message for current 1:1chat user
  initStudent: User; // current user, this will be provided from the parent,Chat component
  @ViewChild('fileUpload') fileUpload: ElementRef;
  @ViewChild('message_container') message_container: ElementRef;
  @ViewChild('input_message') input_message: ElementRef;
  @Input() student: User; // the user of 1:1 chat
  @Input() currentuid: string; //the uid of 1:1 chat
  constructor(
    private chatService: ChatService,
    private uploadService: UploadService
  ) {
    this.filename = '';
    this.firstIndex = -1;
  }

  ngOnInit(): void {
    // get the position of unread message for the current 1:1 chat user
    this.student.messages.map((message, index) => {
      if (
        !message.isRead &&
        message.receiver === this.currentuid &&
        message.sender === this.student.uid
      )
        if (this.firstIndex === -1) {
          this.firstIndex = index;
        }
      return message;
    });
    this.initStudent = { ...this.student };

    setTimeout(() => {
      this.message_container.nativeElement.scrollTop = this.message_container.nativeElement.scrollHeight;
    }, 200);
  }
  ngAfterViewChecked() {
    if (this.initStudent.messages.length !== this.student.messages.length) {
      setTimeout(() => {
        this.message_container.nativeElement.scrollTop = this.message_container.nativeElement.scrollHeight;
      }, 200);
      this.initStudent = { ...this.student };
      return;
    }
    this.student.messages.map((message, index) => {
      if (message.content !== this.initStudent.messages[index].content)
        setTimeout(() => {
          this.message_container.nativeElement.scrollTop = this.message_container.nativeElement.scrollHeight;
        }, 200);
      return message;
    });
  }

  ngAfterViewInit() {
    this.input_message.nativeElement.focus();
  }

  /**
   * send the message in 1:1 chat
   */
  sendMessage(): void {
    if (this.message === '') return;

    this.chatService.sendMessage(this.student.uid, this.message);

    this.message = '';
    this.filename = '';
  }

  /**
   * close the 1:1 chat
   */
  onClose() {
    this.chatService.removeStudent(this.student.id);
  }

  /**
   * minimize the 1:1 chat
   */
  onMinium() {
    this.chatService.changeState(this.student.id);
  }

  /**
   * cancel the file upload
   */
  onCloseUpload() {
    this.filename = '';
  }

  /**
   * Upload file
   * @param file
   */
  uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    this.uploadService
      .upload(formData)
      .pipe(
        map((event) => {}),
        catchError((error: HttpErrorResponse) => {
          return of(`Upload failed:${file.name}`);
        })
      )
      .subscribe((event: any) => {
        if (typeof event === 'object') {
          console.log(event.body);
        }
      });
  }

  // This is called when click the upload button
  onLink() {
    const fileUpload = this.fileUpload.nativeElement;
    fileUpload.onchange = () => {
      const file = fileUpload.files[0];

      this.filename = file.name;

      this.uploadFile(file);
    };
    fileUpload.click();
  }

  /**
   * remove the unread message
   */
  onInputMessageClick() {
    this.chatService.setReadMessage(this.student.uid, 1);
  }
}
