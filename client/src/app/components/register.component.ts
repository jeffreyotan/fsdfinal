import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WebService } from '../web.services';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  form: FormGroup;
  verifyForm: FormGroup;

  serverMsg: string;
  isRegistered: boolean;

  constructor(private fb: FormBuilder, private webSvc: WebService) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      email: this.fb.control('', [ Validators.required, Validators.email ]),
      username: this.fb.control('', [ Validators.required ]),
      password: this.fb.control('', [ Validators.required ])
    });
    this.verifyForm = this.fb.group({
      code: this.fb.control('', [ Validators.required ])
    });
    this.serverMsg = "Kindly enter verification code from your email after registration";
    this.isRegistered = false;
  }

  onClickSubmit(): void {
    // console.info(`-> Clicked submit with form values:`, this.form.value);
    const serverReply = this.webSvc.registerUser(
      this.form.get('email').value,
      this.form.get('username').value,
      this.form.get('password').value
    );
    serverReply.then(msg => {
      // at this point, the registration at the server is successful
      this.serverMsg = msg;
      this.isRegistered = true;
    }).catch(e => {
      console.error('-> Error from server: ', e);
    });
  }

  onClickVerify(): void {
    const serverReply = this.webSvc.verifyUser(this.verifyForm.get('code').value);
    serverReply.then(msg => {
      // at this point, the verification at the server is successful
      this.serverMsg = msg;
    }).catch(e => {
      console.error('-> Error from server: ', e);
    });
  }

  canVerify(): boolean {
    const isComplete: boolean = this.form.valid && this.isRegistered;
    console.info('-> isComplete: ', isComplete);
    return isComplete;
  }

}
