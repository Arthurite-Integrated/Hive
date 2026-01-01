export class InstructorController {
  static instance = null;

  static getInstance() {
    if (!this.instance) this.instance = new InstructorController();
    return this.instance;
  }

  constructor () {}
}