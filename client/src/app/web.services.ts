import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { UserRegistrationData } from "./models";

@Injectable()
export class WebService implements CanActivate {
    registerUrl: string = '/newuser';
    verifyUrl: string = '/verify';
    loginUrl: string = '/login';

    private token = '';

    constructor(private http: HttpClient, private router: Router) { }

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
            // if we are here, something failed (likely a 500 status)
            console.error('-> New user registration failed: ', e);
            result = e;
        }

        return result;
    }

    async verifyUser(hash: string): Promise<string> {
        console.info(`-> verifying user with hash ${hash}`);
        let result: string = "";
        try {
            const serverReply = await this.http.post<any>(this.verifyUrl, { hash }).toPromise();
            // if we get to this point, we got a 200 status
            console.info('-> verifyUser returns: ', serverReply);
            result = serverReply.message;
        } catch (e) {
            // if we are here, something failed (likely a 500 status)
            console.error('-> Verify user failed: ', e);
            result = e;
        }

        return result;
    }

    login(username: string, password: string) {
        this.token = '';
        return this.http.post<any>(this.loginUrl, { username, password }, {observe: 'response'}).toPromise()
            .then(res => {
                console.info('-> res: ', res);
                if(res.status === 200) {
                    this.token = res.body.token;
                }
                return true;
            })
            .catch(e => {
                console.error('-> error: ', e);
                if(e.status === 401) {
                    // handle error
                }
                return false;
            });
    }

    isLogin() {
        return this.token != '';
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if(this.isLogin()) {
            return true;
        }
        return this.router.parseUrl('/error');
    }
}