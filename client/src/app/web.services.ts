import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { UserRegistrationData } from "./models";

@Injectable()
export class WebService {
    registerUrl: string = '/newuser';
    loginUrl: string = '/auth';

    constructor(private http: HttpClient) { }

    async registerUser(email: string, username: string, password: string): Promise<string> {
        console.info(`-> register user with email ${email}, username ${username} and password ${password}`);
        const newUserData: UserRegistrationData = {
            email, username, password
        }

        let result: string = "";
        try {
            const serverReply = await this.http.post<any>(this.registerUrl, newUserData).toPromise();
            // if we get to this point, we got a 200 status
            console.info('-> registerUser returns: ', serverReply);
            result = serverReply.message;
        } catch (e) {
            // if we are here, something failed (likely a 401 status)
            console.error('-> New user registration failed: ', e);
            result = e;
        }

        return result;
    }
}