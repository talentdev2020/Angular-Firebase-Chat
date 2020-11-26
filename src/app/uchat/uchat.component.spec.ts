import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UchatComponent } from './uchat.component';
// import { ChatComponent } from '../chat/chat.component';

describe('UchatComponent', () => {
  let component: UchatComponent;
  let fixture: ComponentFixture<UchatComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [UchatComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UchatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
