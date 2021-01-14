import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { Subject } from "rxjs";
import { BaseMessage } from "./messages";
import { UserRegistrationData, UserProfileData } from "./models";

@Injectable()
export class WebService implements CanActivate {
    registerUrl: string = '/newuser';
    verifyUrl: string = '/verify';
    loginUrl: string = '/login';
    createProfileUrl: string = '/createprofile';
    retrieveTransactionsUrl: string = '/transactions';
    clearTransactionsUrl: string = '/clear';

    event = new Subject<BaseMessage>();

    private token = '';
    private activeUser = '';
    private isFirstUse = true;

    private sock: WebSocket = null;

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
        this.logout();
        return this.http.post<any>(this.loginUrl, { username, password }, {observe: 'response'}).toPromise()
            .then(res => {
                console.info('-> res: ', res);
                if(res.status === 200) {
                    this.token = res.body.token;
                    this.activeUser = username;
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

    logout() {
        this.token = '';
        this.activeUser = '';
        this.leave();
    }

    createUserProfile(userData: UserProfileData) {
        this.isFirstUse = true;
        const httpOptions = {
            headers: new HttpHeaders({
                'Authorization': 'Bearer ' + this.token,
                'Content-Type': 'application/json'
            })
        };
        return this.http.post<any>(this.createProfileUrl, userData, httpOptions).toPromise()
            .then(res => {
                console.info('-> res: ', res);
                if(res.status === 200) {
                    this.isFirstUse = false;
                }
                return true;
            })
            .catch(e => {
                console.error('-> error: ', e);
                if(e.status != 200) {
                    // handle error
                }
                return false;
            });
    }

    retrieveTransactions() {
        return this.http.get<any>(this.retrieveTransactionsUrl + '/' + this.activeUser).toPromise();
    }

    clearUserTransactions() {
        const httpOptions = {
            headers: new HttpHeaders({
                'Authorization': 'Bearer ' + this.token,
                'Content-Type': 'application/json'
            })
        };
        return this.http.post<any>(this.clearTransactionsUrl, { username: this.activeUser }, httpOptions).toPromise();
    }

    join(username: string) {
        const params = new HttpParams().set('username', username);
        const url = `ws://localhost:3000/connect?${params.toString()}`;
        this.sock = new WebSocket(url);

        console.info(`-> Created WebSocket to ${url}`);
        // handle incoming messages
        this.sock.onmessage = (payload: MessageEvent) => {
            // parse the string to ChatMessage
            const msg = JSON.parse(payload.data) as BaseMessage;
            this.event.next(msg);
        };

        // handle accidental socket closure
        this.sock.onclose = () => {
            console.info('-> in function join.onclose with sock: ', this.sock);
            if(this.sock != null) {
                this.sock.close();
                this.sock = null;
            }
        };
    }

    leave() {
        console.info('-> Closing the WebSocket');
        if(this.sock != null) {
            console.info('-> Performing this.sock.close()');
            this.sock.close();
            this.sock = null;
            console.info('-> Completed this.sock.close()');
        }
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if(this.isLogin()) {
            return true;
        }
        return this.router.parseUrl('/error');
    }
}