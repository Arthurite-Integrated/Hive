export class StudentController {
  static instance = null;

  static getInstance() {
    if (!this.instance) this.instance = new StudentController();
    return this.instance;
  }

  constructor () {}
}