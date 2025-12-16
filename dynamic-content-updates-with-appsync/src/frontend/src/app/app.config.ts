import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { Amplify } from 'aws-amplify';
import { environment } from '../environments/environment';

// Configure Amplify at app initialization with Hosted UI
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: environment.cognitoUserPoolId,
      userPoolClientId: environment.cognitoClientId,
      loginWith: {
        oauth: {
          domain: environment.cognitoDomain,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: environment.redirectSignIn,
          redirectSignOut: environment.redirectSignOut,
          responseType: 'code'
        }
      }
    }
  },
  API: {
    GraphQL: {
      endpoint: environment.appSyncEndpoint,
      region: environment.awsRegion,
      defaultAuthMode: 'userPool'
    }
  }
});
console.log(environment);
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync()
  ]
};
