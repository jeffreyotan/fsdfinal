import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { UserRegistrationData } from "./models";

@Injectable()
export class WebService {
    registerUrl: string = '/newuser';
    loginUrl: string = '/login';

    constructor(private http: HttpClient) { }

    async registerUser(email: string, username: string, password: string): Promise<boolean> {
        console.info(`-> register user with email ${email}, username ${username} and password ${password}`);
        const newUserData: UserRegistrationData = {
            email, username, password
        }

        let result: boolean = false;
        try {
            await this.http.post<any>(this.registerUrl, newUserData).toPromise();
            // if we get to this point, we got a 200 status
            console.info('-> registerUser returns true');
            result = true;
        } catch (e) {
            // if we are here, something failed (likely a 401 status)
            console.error('-> New user registration failed: ', e);
        }

        return result;
    }
}