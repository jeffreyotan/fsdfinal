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

  serverMsg: string;

  constructor(private fb: FormBuilder, private webSvc: WebService) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      email: this.fb.control('', [ Validators.required, Validators.email ]),
      username: this.fb.control('', [ Validators.required ]),
      password: this.fb.control('', [ Validators.required ])
    });
    this.serverMsg = "";
  }

  onClickSubmit(): void {
    // console.info(`-> Clicked submit with form values:`, this.form.value);
    const serverReply = this.webSvc.registerUser(
      this.form.get('email').value,
      this.form.get('username').value,
      this.form.get('password').value
    );
    serverReply.then(msg => {
      this.serverMsg = msg;
    }).catch(e => {
      console.error('-> Error from server: ', e);
    });
  }

}
