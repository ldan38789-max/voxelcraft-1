import { BlockType } from "./blockTypes";
import { HOTBAR_BLOCKS } from "./settings";

export interface ItemStack {
  blockId: number;
  count: number;
}

export type Slot = ItemStack | null;

export const HOTBAR_SIZE = 9;
export const INVENTORY_ROWS = 3;
export const INVENTORY_COLS = 9;
export const MAIN_SIZE = INVENTORY_ROWS * INVENTORY_COLS;
export const TOTAL_SLOTS = HOTBAR_SIZE + MAIN_SIZE;
export const MAX_STACK = 64;
const STARTER_STACK_COUNT = 64;

export interface InventorySnapshot {
  slots: Slot[];
  selectedHotbar: number;
  cursorStack: Slot;
}

export class Inventory {
  private slots: Slot[];
  private selectedHotbar = 0;
  private cursorStack: Slot = null;

  constructor() {
    this.slots = new Array(TOTAL_SLOTS).fill(null);
    HOTBAR_BLOCKS.forEach((blockId, i) => {
      if (i < HOTBAR_SIZE && blockId !== BlockType.AIR) {
        this.slots[i] = { blockId, count: STARTER_STACK_COUNT };
      }
    });
  }

  loadFromSnapshot(snapshot: { slots: Slot[]; selectedHotbar: number }): void {
    this.slots = snapshot.slots.map((s) => (s ? { ...s } : null));
    this.selectedHotbar = snapshot.selectedHotbar;
    this.cursorStack = null;
  }

  selectHotbar(index: number): void {
    if (index >= 0 && index < HOTBAR_SIZE) {
      this.selectedHotbar = index;
    }
  }

  get selectedIndex(): number {
    return this.selectedHotbar;
  }

  getSelectedItem(): Slot {
    return this.slots[this.selectedHotbar];
  }

  consumeSelected(): void {
    const stack = this.slots[this.selectedHotbar];
    if (!stack) return;
    stack.count -= 1;
    if (stack.count <= 0) this.slots[this.selectedHotbar] = null;
  }

  addItem(blockId: number, count: number): number {
    if (blockId === BlockType.AIR || count <= 0) return 0;
    let remaining = count;

    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const s = this.slots[i];
      if (s && s.blockId === blockId && s.count < MAX_STACK) {
        const space = MAX_STACK - s.count;
        const add = Math.min(space, remaining);
        s.count += add;
        remaining -= add;
      }
    }

    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (!this.slots[i]) {
        const add = Math.min(MAX_STACK, remaining);
        this.slots[i] = { blockId, count: add };
        remaining -= add;
      }
    }

    return remaining;
  }

  clickSlot(index: number, rightClick = false): void {
    if (index < 0 || index >= this.slots.length) return;
    const slot = this.slots[index];
    const cursor = this.cursorStack;

    if (!rightClick) {
      if (!cursor) {
        if (slot) {
          this.slots[index] = null;
          this.cursorStack = slot;
        }
        return;
      }
      if (!slot) {
        this.slots[index] = cursor;
        this.cursorStack = null;
        return;
      }
      if (slot.blockId === cursor.blockId) {
        const total = slot.count + cursor.count;
        if (total <= MAX_STACK) {
          slot.count = total;
          this.cursorStack = null;
        } else {
          slot.count = MAX_STACK;
          cursor.count = total - MAX_STACK;
        }
      } else {
        this.slots[index] = cursor;
        this.cursorStack = slot;
      }
      return;
    }

    // Click phải
    if (!cursor) {
      if (slot) {
        const half = Math.ceil(slot.count / 2);
        this.cursorStack = { blockId: slot.blockId, count: half };
        slot.count -= half;
        if (slot.count <= 0) this.slots[index] = null;
      }
      return;
    }
    if (!slot) {
      this.slots[index] = { blockId: cursor.blockId, count: 1 };
      cursor.count -= 1;
      if (cursor.count <= 0) this.cursorStack = null;
      return;
    }
    if (slot.blockId === cursor.blockId && slot.count < MAX_STACK) {
      slot.count += 1;
      cursor.count -= 1;
      if (cursor.count <= 0) this.cursorStack = null;
    }
  }

  returnCursorStack(): void {
    if (!this.cursorStack) return;
    const leftover = this.addItem(this.cursorStack.blockId, this.cursorStack.count);
    this.cursorStack = leftover > 0 ? { blockId: this.cursorStack.blockId, count: leftover } : null;
  }

  getSnapshot(): InventorySnapshot {
    return {
      slots: this.slots.map((s) => (s ? { ...s } : null)),
      selectedHotbar: this.selectedHotbar,
      cursorStack: this.cursorStack ? { ...this.cursorStack } : null,
    };
  }
}
