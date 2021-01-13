import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserProfileData } from '../models';
import { WebService } from '../web.services';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  mainForm: FormGroup;

  isFirstTime: boolean;

  constructor(private fb: FormBuilder, private webSvc: WebService) { }

  ngOnInit(): void {
    this.mainForm = this.fb.group({
      income: this.fb.control('', [ Validators.required ]),
      save: this.fb.control('30', [ Validators.required ]),
      spend: this.fb.control('50', [ Validators.required ]),
      donate: this.fb.control('10', [ Validators.required ]),
      invest: this.fb.control('10', [ Validators.required ])
    });
    this.isFirstTime = true;
    this.retrievePastTransactions()
  }

  retrievePastTransactions() {
    this.webSvc.retrieveTransactions()
      .then(results => {
        const data = results['data'];
        console.info('-> Transactions received: ', data);
        console.info('-> Peeking at data.username: ', data.username);
        if(data["username"] != null) {
          // we have a user profile as an empty object will be returned for a new user
          const userProfile: UserProfileData = data["profile"];
          console.info('-> userProfile: ', userProfile);
        }
      })
      .catch(e => {
        console.error('-> Error in retrieving transactions');
      });
  }

  onClickSubmit(): void {
    console.info('-> mainForm values: ', this.mainForm.value);
    this.isFirstTime = true;
    this.webSvc.createUserProfile({
      income: parseFloat(this.mainForm.get('income').value),
      save: parseFloat(this.mainForm.get('save').value),
      spend: parseFloat(this.mainForm.get('spend').value),
      donate: parseFloat(this.mainForm.get('donate').value),
      invest: parseFloat(this.mainForm.get('invest').value)
    })
    .then(result => {
      console.info('-> Create User Profile is successful!.. setting isFirstTime to false');
      this.isFirstTime = !result;
      this.retrievePastTransactions();
    })
    .catch(e => {
      console.error('-> Create User Profile failed with error ', e);
    });
  }

}
