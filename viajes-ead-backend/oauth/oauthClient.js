import {google} from "googleapis";

export function getOAuth2Client(client_id, client_secret, redirect_url, refresh_token) {
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_url);
    oAuth2Client.setCredentials({ refresh_token: refresh_token });
    return oAuth2Client;
}