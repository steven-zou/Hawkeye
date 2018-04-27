import { Component, OnInit, Input } from '@angular/core';
import { Container } from '../interface/container';

@Component({
  selector: 'app-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss']
})
export class ContainerComponent implements OnInit {

  @Input()
  data: Container;

  constructor() { }

  ngOnInit() {
  }

  public get title(): string {
    return this.data.name+"@"+this.data.version;
  }

}
