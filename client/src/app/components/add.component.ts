import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WebService } from '../web.services';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.css']
})
export class AddComponent implements OnInit {

  form: FormGroup;

  status: string;

  constructor(private fb: FormBuilder, private router: Router, private webSvc: WebService) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: this.fb.control('', [ Validators.required ]),
      amount: this.fb.control('', [ Validators.required ]),
      comments: this.fb.control('', [ Validators.required ]),
      category: this.fb.control('', [ Validators.required ])
    });
    this.status = '';
  }

  onClickSubmit() {
    const formData = {
      title: this.form.get('title').value,
      amount: parseFloat(this.form.get('amount').value),
      comments: this.form.get('comments').value,
      category: this.form.get('category').value
    }
    console.info('-> New transaction: ', formData);
    this.status = 'Kindly wait for transaction to be updated';
    this.webSvc.addNewTransaction(formData)
      .then(results => {
        console.info('-> Item added:', results);
        this.form.reset();
        this.status = 'Transaction added. To return to the summary page, please click the Back button. To add another transaction, enter details above';
      })
      .catch(e => {
        console.error('-> Error adding new item:', e);
      });
  }

  onClickBack() {
    this.router.navigate(['/main']);
  }

}
