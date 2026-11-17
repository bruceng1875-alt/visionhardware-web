// Local SQLite adapter for the D1 methods used by RFQ. Cloud tests still required.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function openLocalDB(filename=':memory:'){
 const sqlite=new DatabaseSync(filename);
 sqlite.exec('PRAGMA foreign_keys=ON');
 if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='inquiries'").get())sqlite.exec(readFileSync(new URL('../migrations/0001_inquiries.sql',import.meta.url),'utf8'));
 const definition=sqlite.prepare("SELECT sql FROM sqlite_master WHERE name='inquiries'").get().sql;
 if(!definition.includes("'metal-labels'")){sqlite.exec('BEGIN IMMEDIATE');try{sqlite.exec(readFileSync(new URL('../migrations/0002_supplied_categories.sql',import.meta.url),'utf8'));sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}}
 const db={
  prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){return sqlite.prepare(sql).run(...this.args);}};},
  async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>sqlite.prepare(s.sql).run(...s.args));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}},
  close(){sqlite.close();}
 };return db;
}
