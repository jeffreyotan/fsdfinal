import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WebService } from '../web.services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  form: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private webSvc: WebService) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      username: this.fb.control('', [ Validators.required ]),
      password: this.fb.control('', [ Validators.required ])
    });
  }

  onClickSubmit(): void {
    console.info('-> Login form values', this.form.value);
    this.webSvc.login(this.form.get('username').value, this.form.get('password').value)
      .then(result => {
        console.info('-> result: ', result);
        this.router.navigate(['/main']);
      })
      .catch(e => {
        console.error('-> Error: ', e);
      });
  }

}
