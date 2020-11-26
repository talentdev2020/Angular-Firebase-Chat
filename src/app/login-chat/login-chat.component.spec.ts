import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginChatComponent } from './login-chat.component';

describe('LoginChatComponent', () => {
  let component: LoginChatComponent;
  let fixture: ComponentFixture<LoginChatComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoginChatComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
