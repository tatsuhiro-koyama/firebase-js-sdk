import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';
import {
  AdminAppOptions,
  TestAppOptions,
  LoadRulesOptions,
  FirebaseDatabaseTesting
} from '@firebase/testing-types';

const DBURL = 'http://localhost:9000';

class FakeCredentials {
  getAccessToken() {
    return Promise.resolve({
      expires_in: 1000000,
      access_token: 'owner'
    });
  }
  getCertificate() {
    return null;
  }
}

export class Database implements FirebaseDatabaseTesting {
  apps(): (admin.app.App | null)[] {
    return admin.apps;
  }

  initializeAdminApp(options: AdminAppOptions): admin.app.App {
    if (!('databaseName' in options)) {
      throw new Error('databaseName not specified');
    }
    return admin.initializeApp(
      {
        credential: new FakeCredentials(),
        databaseURL: DBURL + '?ns=' + options.databaseName
      },
      'app-' + (new Date().getTime() + Math.random())
    );
  }

  initializeTestApp(options: TestAppOptions): admin.app.App {
    if (!('databaseName' in options)) {
      throw new Error('databaseName not specified');
    }
    // if options.auth is not present, we will construct an app with auth == null
    return admin.initializeApp(
      {
        credential: new FakeCredentials(),
        databaseURL: DBURL + '?ns=' + options.databaseName,
        databaseAuthVariableOverride: options.auth || null
      },
      'app-' + (new Date().getTime() + Math.random())
    );
  }

  loadRules(options: LoadRulesOptions): void {
    if (!('databaseName' in options)) {
      throw new Error('databaseName not specified');
    }
    if (!('rulesPath' in options)) {
      throw new Error('rulesPath not specified');
    }
    if (!fs.existsSync(options.rulesPath)) {
      throw new Error('Could not find file: ' + options.rulesPath);
    }
    fs
      .createReadStream(options.rulesPath)
      .pipe(
        request({
          uri: DBURL + '/.settings/rules.json?ns=' + options.databaseName,
          method: 'PUT',
          headers: { Authorization: 'Bearer owner' }
        })
      )
      .catch(function(err) {
        throw new Error('could not load rules: ' + err);
      });
  }

  assertFails(pr: Promise<void>): any {
    return pr.then(
      v =>
        Promise.reject(
          new Error('Expected request to fail, but it succeeded.')
        ),
      err => err
    );
  }

  assertSuccess(pr: Promise<void>): any {
    return pr;
  }
}