export class ParentController {
  static instance = null;

  static getInstance() {
    if (!this.instance) this.instance = new ParentController();
    return this.instance;
  }

  constructor () {}
}