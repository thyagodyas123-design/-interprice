import * as pty from "node-pty";

type OnData = (nodeId: string, data: string) => void;
type OnExit = (nodeId: string, code: number) => void;

export class PtyManager {
  private procs = new Map<string, pty.IPty>();

  constructor(private onData: OnData, private onExit: OnExit) {}

  spawn(opts: {
    nodeId: string;
    command: string;
    args: string[];
    cwd: string;
    cols: number;
    rows: number;
  }) {
    this.kill(opts.nodeId);
    const proc = pty.spawn(opts.command, opts.args, {
      name: "xterm-256color",
      cols: opts.cols,
      rows: opts.rows,
      cwd: opts.cwd,
      env: process.env as Record<string, string>,
    });
    this.procs.set(opts.nodeId, proc);
    proc.onData((d) => this.onData(opts.nodeId, d));
    proc.onExit(({ exitCode }) => {
      this.procs.delete(opts.nodeId);
      this.onExit(opts.nodeId, exitCode);
    });
    return proc;
  }

  write(nodeId: string, data: string) {
    this.procs.get(nodeId)?.write(data);
  }

  resize(nodeId: string, cols: number, rows: number) {
    this.procs.get(nodeId)?.resize(cols, rows);
  }

  kill(nodeId: string) {
    const p = this.procs.get(nodeId);
    if (p) {
      this.procs.delete(nodeId);
      p.kill();
    }
  }

  killAll() {
    for (const id of [...this.procs.keys()]) this.kill(id);
  }
}
