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

  constructor(private fb: FormBuilder, private webSvc: WebService) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      email: this.fb.control('', [ Validators.required, Validators.email ]),
      username: this.fb.control('', [ Validators.required ]),
      password: this.fb.control('', [ Validators.required ])
    });
  }

  onClickSubmit(): void {
    // console.info(`-> Clicked submit with form values:`, this.form.value);
    this.webSvc.registerUser(
      this.form.get('email').value,
      this.form.get('username').value,
      this.form.get('password').value
    );
  }

}
