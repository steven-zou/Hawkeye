import { Component, OnInit, OnDestroy } from '@angular/core';
import { Container, Runtime } from '../interface/models'
import { DataSet, Network, EdgeOptions, NodeOptions, Node, Edge } from 'vis';
import { Http, RequestOptions, Headers } from '@angular/http';

const HTTP_JSON_OPTIONS: RequestOptions = new RequestOptions({
  headers: new Headers({
    "Content-Type": 'application/json',
    "Accept": 'application/json'
  })
});

const API_BASE: string = "/api/v1";
const STATS_API: string = API_BASE + "/stats";
const COMMANDS_API: string = API_BASE + "/commands";
const SERVING_NODE_ID = "serving_status_node";
const IDLE_NODE_ID = "idle_status_node";
const DESTROYED_NODE_ID = "destroyed_status_node";
const STATUS_SERVING = "serving";
const STATUS_IDLE = "Idle";
const STATUS_DESTROYED = "Destroyed";

@Component({
  selector: 'app-simulator',
  templateUrl: './simulator.component.html',
  styleUrls: ['./simulator.component.scss']
})
export class SimulatorComponent implements OnInit, OnDestroy {

  containers: Container[];
  private network: Network;
  private nodes: DataSet<Node>;
  private edges: DataSet<Edge>;

  private commands: string[] = [];
  private runtimes: Runtime[] = [];
  private alertClosed: boolean = true;
  private alertText: string = "";
  private ticker: any = null;

  private getCommands(): Promise<string[]> {
    return this.http.get(COMMANDS_API, HTTP_JSON_OPTIONS).toPromise()
      .then(response => response.json() as string[])
      .catch(error => Promise.reject(error));
  }

  private getRuntimes(): Promise<Runtime[]> {
    return this.http.get(STATS_API, HTTP_JSON_OPTIONS).toPromise()
      .then(response => response.json() as Runtime[])
      .catch(error => Promise.reject(error));
  }

  private showError(error: any): void {
    this.alertText = '' + error;
    this.alertClosed = false;
    setTimeout(() => {
      this.alertClosed = true;
    }, 10000);
  }

  private initNetwork(): void {
    this.nodes = new DataSet([
      { id: SERVING_NODE_ID, label: "Serving", color: "#2bdb72", shape: "square", fixed: true, x: -300, y: -600 },
      { id: IDLE_NODE_ID, label: "Idle", color: "#e8d212", shape: "square", fixed: true, x: 300, y: -600 },
      { id: DESTROYED_NODE_ID, label: "Destroyed", color: "#e5502b", shape: "square", fixed: true, x: 900, y: -600 }
    ]);

    this.edges = new DataSet([
      { from: SERVING_NODE_ID, to: IDLE_NODE_ID, smooth: false, arrows: 'to', width: 5, dashes: true },
      { from: IDLE_NODE_ID, to: DESTROYED_NODE_ID, smooth: false, arrows: 'to', width: 5, dashes: true }
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
  }

  // add to list
  private addNode(runtime: Runtime, to: string): void {
    if (!runtime) {
      return;
    }

    let node: Node = {
      id: runtime.id,
      label: runtime.container_image + "(" + runtime.id + ")",
      color: "#2bdb72"
    };
    switch (to) {
      case IDLE_NODE_ID:
        node.color = "#e8d212";
        break;
      case DESTROYED_NODE_ID:
        node.color = "#e5502b";
        break;
      case SERVING_NODE_ID:
        node.color = "#2bdb72";
        break;
    }
    this.nodes.add(node);

    this.edges.add({
      id: this.myEdgeID(runtime.id, to),
      from: runtime.id,
      to: to
    });
  }

  private addNode2Serving(runtime: Runtime): void {
    this.addNode(runtime, SERVING_NODE_ID);
  }

  private addNode2Idle(runtime: Runtime): void {
    this.addNode(runtime, IDLE_NODE_ID);
  }

  private addNode2Destroyed(runtime: Runtime): void {
    this.addNode(runtime, DESTROYED_NODE_ID);
  }

  // move from one list node to another list node
  private moveTo(runtime: Runtime, from: string, to: string): void {
    let queryID: string = this.myEdgeID(runtime.id, from);
    let edge: Edge = this.edges.get(queryID);
    if (edge) {
      if (edge.to === from) {
        // found it
        this.edges.remove(queryID);
        edge.to = to;
        this.edges.add(edge);
        let node: Node = this.nodes.get(runtime.id);
        if (node) {
          this.nodes.remove(node.id);
          switch (to) {
            case IDLE_NODE_ID:
              node.color = "#e8d212";
              break;
            case DESTROYED_NODE_ID:
              node.color = "#e5502b";
              break;
            case SERVING_NODE_ID:
              node.color = "#2bdb72";
              break;
          }
          this.nodes.add(node);
        }
      }
    }
  }
  // move form serving to idle
  private moveToIdle(runtime: Runtime): void {
    this.moveTo(runtime, SERVING_NODE_ID, IDLE_NODE_ID);
  }

  // move from idle to destroyed
  private moveToDestroyed(runtime: Runtime): void {
    this.moveTo(runtime, IDLE_NODE_ID, DESTROYED_NODE_ID);
  }

  private moveToServing(runtime): void {
    this.moveTo(runtime, IDLE_NODE_ID, SERVING_NODE_ID);
  }

  private getNode(id: string): Node {
    return this.nodes.get(id);
  }

  private getEdge(from: string, to: string): Edge {
    let queryID: string = this.myEdgeID(from, to);
    return this.edges.get(queryID);
  }

  private myEdgeID(from: string, to: string): string {
    return from + "->" + to;
  }

  // load latest data
  private refreshData(): void {
    this.getCommands()
      .then((commands: string[]) => {
        this.commands = commands;
      })
      .catch(error => this.showError(error));

    this.getRuntimes()
      .then((runtimes: Runtime[]) => {
        this.runtimes = runtimes;
      })
      .catch(error => this.showError(error));
  }

  constructor(private http: Http) { }

  ngOnInit() {
    this.initNetwork();
    this.ticker = setInterval(() => {
      this.simulate();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  // do simulation
  public simulate(): void {
    this.refreshData();
    if (this.runtimes.length > 0) {
      this.runtimes.forEach((r: Runtime) => {
        let node: Node = this.getNode(r.id);

        switch (r.status) {
          case STATUS_SERVING:
            if (!node) {
              this.addNode2Serving(r);
            } else {
              // only if it's re-serving
              let edge: Edge = this.getEdge(r.id, IDLE_NODE_ID);
              if (edge) {
                this.moveToServing(r);
              }
            }
            break;
          case STATUS_IDLE:
            if (!node) {
              this.addNode2Idle(r);
            } else {
              let edge: Edge = this.getEdge(r.id, SERVING_NODE_ID);
              if (edge) {
                this.moveToIdle(r);
              }
            }
            break;
          case STATUS_DESTROYED:
            if (!node) {
              this.addNode2Destroyed(r);
            } else {
              let edge: Edge = this.getEdge(r.id, IDLE_NODE_ID);
              if (edge) {
                this.moveToDestroyed(r);
              }
            }
            break;
        }
      });

      this.network.redraw();
    }
  }
}
