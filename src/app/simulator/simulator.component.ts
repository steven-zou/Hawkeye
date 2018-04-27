import { Component, OnInit, OnDestroy } from '@angular/core';
import { Container } from '../interface/container'
import { DataSet, Network, EdgeOptions, NodeOptions, Node, Edge } from 'vis';

@Component({
  selector: 'app-simulator',
  templateUrl: './simulator.component.html',
  styleUrls: ['./simulator.component.scss']
})
export class SimulatorComponent implements OnInit, OnDestroy {

  containers: Container[];
  network: Network;
  nodes: DataSet<Node>;
  edges: DataSet<Edge>;
  ticker: any;
  // only for demo
  runningOnes: number = 0;

  constructor() { }

  ngOnInit() {
    this.nodes = new DataSet([
      { id: 'serving_status_node', label: "Serving", color: "#2bdb72", shape: "square", fixed: true, x: -300, y: -600 },
      { id: 'idle_status_node', label: "Idle", color: "#e8d212", shape: "square", fixed: true, x: 300, y: -600 },
      { id: 'destroyed_status_node', label: "Destroyed", color: "#e5502b", shape: "square", fixed: true, x: 900, y: -600 }
    ]);

    this.edges = new DataSet([
      { from: 'serving_status_node', to: 'idle_status_node', smooth: false, arrows: 'to', width: 5, dashes: true },
      { from: 'idle_status_node', to: 'destroyed_status_node', smooth: false, arrows: 'to', width: 5, dashes: true }
    ])

    let container = document.getElementById("containers");
    let data = {
      nodes: this.nodes,
      edges: this.edges
    };

    let edgeOptions: EdgeOptions = {
      color: { inherit: "to" },
      smooth: {
        enabled: true,
        type: "continuous",
        roundness: 0.5
      },
      selectionWidth: 2,
      length: 300
    };

    let nodeOptions: NodeOptions = {
      shape: "dot"
    };

    let options = {
      height: '600px',
      width: '100%',
      interaction: {
        hover: true,
      },
      edges: edgeOptions,
      nodes: nodeOptions
    };
    this.network = new Network(container, data, options);
    this.ticker = setInterval(() => {
      this.simulate();
    }, 3311);
  }

  ngOnDestroy() {
    if (this.ticker) {
      clearInterval(this.ticker);
    }
  }

  public simulate(): void {
    // Just show the pool stats with visual way
    let nodeSize: number = this.nodes.length;
    if (this.runningOnes < 5) {
      this.nodes.add({
        id: this.myNodeID(nodeSize),
        label: "harbor-ui@0.6.10" + nodeSize,
        color: "#2bdb72"
      });

      this.edges.add({
        id: this.myEdgeID(this.myNodeID(nodeSize), 'serving_status_node'),
        from: this.myNodeID(nodeSize),
        to: 'serving_status_node'
      });

      this.runningOnes++;
    } else {
      let now = new Date();
      let flag = now.getMilliseconds() % 2;
      if (flag === 0) {
        try {
          this.edges.forEach((item: Edge) => {
            if (item.to === 'serving_status_node') {
              console.log("to idle")
              this.edges.remove(item.id)
              item.to = 'idle_status_node';
              this.edges.add(item);
              this.runningOnes--;
              let node = this.nodes.get(item.from)
              if (node) {
                this.nodes.remove(node.id);
                node.color = "#e8d212";
                this.nodes.add(node);
              }
              throw "break out"
            }
          });
        } catch (error) {
          // do nothing
        }
      } else {
        try {
          this.edges.forEach((item: Edge) => {
            if (item.to === 'idle_status_node' && item.from !== 'serving_status_node') {
              console.log('to destroyed');
              this.edges.remove(item.id);
              item.to = "destroyed_status_node";
              this.edges.add(item);
              let node = this.nodes.get(item.from)
              if (node) {
                console.log(node);
                this.nodes.remove(node.id);
                node.color = "#e5502b";
                this.nodes.add(node);
              }
              throw 'break out';
            }
          });
        } catch (error) {
          // do nothing
        }
      }

      // this.network.fit();
    }
  }

  private myEdgeID(from: string, to: string): string {
    return from + "->" + to;
  }

  private myNodeID(pos: number): string {
    return "container_ins_" + pos;
  }

}
