/** Server anchor + monotonic elapsed time ignores device clock edits during a session.
 * The saved high-water mark also rejects simple clock rollback across restarts.
 * Local storage is not a signed receipt or server-side entitlement service.
 */
export class AccessClock {
  private anchor: number | null = null;
  private started = 0;
  private floor: number;
  private wall: () => number;
  private monotonic: () => number;
  constructor(saved = 0, wall = () => Date.now(), monotonic = () => performance.now()) {
    this.wall = wall; this.monotonic = monotonic;
    this.floor = Number.isFinite(saved) && saved > 0 ? saved : 0;
  }
  sync(server: number) {
    if (!Number.isFinite(server) || server <= 0) return false;
    const value = this.anchor === null ? server : Math.max(server,this.now());
    this.anchor = value; this.started = this.monotonic(); this.floor = value;
    return true;
  }
  now() {
    const value = this.anchor === null ? this.wall() : this.anchor + Math.max(0,this.monotonic() - this.started);
    this.floor = Math.max(this.floor,value);
    return this.floor;
  }
}
