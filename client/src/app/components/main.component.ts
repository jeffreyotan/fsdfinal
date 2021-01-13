import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  mainForm: FormGroup;

  isFirstTime: boolean;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.mainForm = this.fb.group({
      income: this.fb.control('', [ Validators.required ]),
      save: this.fb.control('30', [ Validators.required ]),
      spend: this.fb.control('50', [ Validators.required ]),
      donate: this.fb.control('10', [ Validators.required ]),
      invest: this.fb.control('10', [ Validators.required ])
    });
    this.isFirstTime = true;
  }

  onClickSubmit() {
    console.info(`-> Main submit button was clicked`);
  }

}
