import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  form: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      email: this.fb.control('', [ Validators.required, Validators.email ]),
      username: this.fb.control('', [ Validators.required ]),
      password: this.fb.control('', [ Validators.required ])
    });
  }

  onClickSubmit(): void {
    console.info(`-> Clicked submit with form values:`, this.form.value);
  }

}
