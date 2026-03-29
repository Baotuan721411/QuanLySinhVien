/**
 * B-Tree implementation for degree 3 (2-3 Tree)
 */

export class BTreeNode<T> {
  id: string;
  keys: string[];
  values: T[];
  children: BTreeNode<T>[];
  isLeaf: boolean;

  constructor(isLeaf: boolean = true) {
    this.id = Math.random().toString(36).substring(2, 11);
    this.keys = [];
    this.values = [];
    this.children = [];
    this.isLeaf = isLeaf;
  }
}

export type AnimationStepData<T> = 
  | { type: 'highlight'; nodeId: string; description: string }
  | { type: 'compare'; nodeId: string; key: string; description: string }
  | { type: 'insert_key'; nodeId: string; key: string; index: number; description: string }
  | { type: 'split'; nodeId: string; leftId: string; rightId: string; midKey: string; description: string }
  | { type: 'move_up'; fromId: string; toId: string; key: string; description: string }
  | { type: 'delete_key'; nodeId: string; key: string; description: string }
  | { type: 'borrow'; fromId: string; toId: string; key: string; description: string }
  | { type: 'merge'; leftId: string; rightId: string; parentId: string; description: string }
  | { type: 'replace'; nodeId: string; oldKey: string; newKey: string; description: string }
  | { type: 'found'; nodeId: string; key: string; description: string }
  | { type: 'not_found'; description: string }
  | { type: 'done'; description: string };

export type AnimationStep<T> = AnimationStepData<T> & { treeSnapshot?: BTreeNode<T> };

export class BTree<T> {
  root: BTreeNode<T>;
  degree: number;
  steps: AnimationStep<T>[] = [];

  constructor(degree: number = 3) {
    this.root = new BTreeNode<T>(true);
    this.degree = degree;
  }

  private addStep(step: AnimationStepData<T>) {
    this.steps.push({
      ...step,
      treeSnapshot: this.cloneNode(this.root)
    } as AnimationStep<T>);
  }

  search(key: string, node: BTreeNode<T> = this.root): { node: BTreeNode<T>; index: number } | null {
    this.addStep({ type: 'highlight', nodeId: node.id, description: `Đang kiểm tra node: ${node.keys.join(', ')}` });
    
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) {
      this.addStep({ type: 'compare', nodeId: node.id, key: node.keys[i], description: `So sánh ${key} với ${node.keys[i]}` });
      i++;
    }

    if (i < node.keys.length && key === node.keys[i]) {
      this.addStep({ type: 'found', nodeId: node.id, key: node.keys[i], description: `Tìm thấy ${key} tại node hiện tại!` });
      return { node, index: i };
    }

    if (node.isLeaf) {
      this.addStep({ type: 'not_found', description: `Không tìm thấy ${key} trong cây.` });
      return null;
    }

    this.addStep({ type: 'highlight', nodeId: node.children[i].id, description: `Di chuyển xuống con thứ ${i + 1}` });
    return this.search(key, node.children[i]);
  }

  insert(key: string, value: T) {
    this.steps = [];
    const result = this._insert(this.root, key, value);
    if (result) {
      const { splitKey, splitValue, leftChild, rightChild } = result;
      const oldRootId = this.root.id;
      
      // Create new root
      const newRoot = new BTreeNode<T>(false);
      newRoot.keys = [splitKey];
      newRoot.values = [splitValue];
      newRoot.children = [leftChild, rightChild];
      
      // Before setting new root, we can't easily show the split
      // So we set it and then record the split
      this.root = newRoot;

      this.addStep({ 
        type: 'split', 
        nodeId: oldRootId, 
        leftId: leftChild.id, 
        rightId: rightChild.id, 
        midKey: splitKey,
        description: `Tách root cũ, đưa ${splitKey} lên làm root mới`
      });
    }
    this.addStep({ type: 'done', description: 'Hoàn tất thêm phần tử' });
  }

  private _insert(node: BTreeNode<T>, key: string, value: T): any {
    this.addStep({ type: 'highlight', nodeId: node.id, description: `Duyệt node: ${node.keys.join(', ')}` });
    
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) {
      i++;
    }

    if (i < node.keys.length && key === node.keys[i]) {
      node.values[i] = value;
      return null;
    }

    if (node.isLeaf) {
      node.keys.splice(i, 0, key);
      node.values.splice(i, 0, value);
      this.addStep({ type: 'insert_key', nodeId: node.id, key, index: i, description: `Chèn ${key} vào node lá` });
    } else {
      const result = this._insert(node.children[i], key, value);
      if (result) {
        const { splitKey, splitValue, leftChild, rightChild } = result;
        const childId = node.children[i].id;
        
        // Update parent with split results
        node.keys.splice(i, 0, splitKey);
        node.values.splice(i, 0, splitValue);
        node.children.splice(i, 1, leftChild, rightChild);

        // Record split (showing the new structure)
        this.addStep({ 
          type: 'split', 
          nodeId: childId, 
          leftId: leftChild.id, 
          rightId: rightChild.id, 
          midKey: splitKey,
          description: `Tách node con, đưa ${splitKey} lên node cha`
        });

        // Record move up (highlighting the parent where the key moved)
        this.addStep({ type: 'move_up', fromId: childId, toId: node.id, key: splitKey, description: `Đưa ${splitKey} lên node hiện tại` });
      }
    }

    if (node.keys.length >= this.degree) {
      return this.split(node);
    }
    return null;
  }

  private split(node: BTreeNode<T>) {
    const mid = Math.floor(node.keys.length / 2);
    const splitKey = node.keys[mid];
    const splitValue = node.values[mid];

    const left = new BTreeNode<T>(node.isLeaf);
    left.id = node.id; // Keep original ID for the left part to animate smoothly
    left.keys = node.keys.slice(0, mid);
    left.values = node.values.slice(0, mid);
    if (!node.isLeaf) {
      left.children = node.children.slice(0, mid + 1);
    }

    const right = new BTreeNode<T>(node.isLeaf);
    right.keys = node.keys.slice(mid + 1);
    right.values = node.values.slice(mid + 1);
    if (!node.isLeaf) {
      right.children = node.children.slice(mid + 1);
    }

    return { splitKey, splitValue, leftChild: left, rightChild: right };
  }

  delete(key: string) {
    this.steps = [];
    if (this.root.keys.length === 0) {
      this.addStep({ type: 'not_found', description: 'Cây đang trống, không thể xóa.' });
      return;
    }

    this._delete(this.root, key);

    // If root becomes empty, update it
    if (this.root.keys.length === 0 && !this.root.isLeaf) {
      const oldRootId = this.root.id;
      this.root = this.root.children[0];
      this.addStep({ 
        type: 'highlight', 
        nodeId: this.root.id, 
        description: 'Root cũ trống, thay thế root bằng con duy nhất của nó.' 
      });
    }

    this.addStep({ type: 'done', description: 'Hoàn tất quá trình xóa phần tử.' });
  }

  private _delete(node: BTreeNode<T>, key: string) {
    this.addStep({ type: 'highlight', nodeId: node.id, description: `Đang kiểm tra node: [${node.keys.join(', ')}]` });
    
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) {
      i++;
    }

    const minKeys = Math.ceil(this.degree / 2) - 1;

    // Case 1: Key is found in this node
    if (i < node.keys.length && key === node.keys[i]) {
      this.addStep({ type: 'found', nodeId: node.id, key, description: `Tìm thấy khóa ${key} tại node hiện tại.` });
      
      if (node.isLeaf) {
        // Case 1a: Key is in a leaf node
        node.keys.splice(i, 1);
        node.values.splice(i, 1);
        this.addStep({ type: 'delete_key', nodeId: node.id, key, description: `Xóa ${key} trực tiếp từ node lá.` });
      } else {
        // Case 1b: Key is in an internal node
        const leftChild = node.children[i];
        const rightChild = node.children[i + 1];

        if (leftChild.keys.length > minKeys) {
          // Borrow from predecessor
          const pred = this.getPredecessor(node, i);
          const oldKey = node.keys[i];
          node.keys[i] = pred.key;
          node.values[i] = pred.value;
          this.addStep({ 
            type: 'replace', 
            nodeId: node.id, 
            oldKey: oldKey, 
            newKey: pred.key, 
            description: `Node con bên trái có đủ phần tử (> ${minKeys}). Thay thế ${oldKey} bằng phần tử lớn nhất bên trái (${pred.key}).` 
          });
          this._delete(leftChild, pred.key);
        } else if (rightChild.keys.length > minKeys) {
          // Borrow from successor
          const succ = this.getSuccessor(node, i);
          const oldKey = node.keys[i];
          node.keys[i] = succ.key;
          node.values[i] = succ.value;
          this.addStep({ 
            type: 'replace', 
            nodeId: node.id, 
            oldKey: oldKey, 
            newKey: succ.key, 
            description: `Node con bên phải có đủ phần tử (> ${minKeys}). Thay thế ${oldKey} bằng phần tử nhỏ nhất bên phải (${succ.key}).` 
          });
          this._delete(rightChild, succ.key);
        } else {
          // Both children have minKeys, merge them
          const leftKeys = [...leftChild.keys];
          const rightKeys = [...rightChild.keys];
          this.merge(node, i);
          this.addStep({ 
            type: 'merge', 
            leftId: leftChild.id, 
            rightId: rightChild.id, 
            parentId: node.id, 
            description: `Cả hai con đều chỉ có ${minKeys} phần tử. Gộp khóa ${key} từ cha xuống cùng với node con bên phải [${rightKeys.join(', ')}] vào node con bên trái [${leftKeys.join(', ')}].` 
          });
          this._delete(leftChild, key);
        }
      }
      return;
    }

    // Case 2: Key is not in this node
    if (node.isLeaf) {
      this.addStep({ type: 'not_found', description: `Đã duyệt đến lá nhưng không tìm thấy khóa ${key}.` });
      return;
    }

    // Proactive step: Ensure the child we are descending into has enough keys
    if (node.children[i].keys.length <= minKeys) {
      this.addStep({ 
        type: 'highlight', 
        nodeId: node.children[i].id, 
        description: `Node con sắp duyệt chỉ có ${node.children[i].keys.length} phần tử (mức tối thiểu). Cần xử lý để tránh thiếu hụt.` 
      });
      this.fill(node, i);
      
      // After fill, the key might have moved to a different child index
      i = 0;
      while (i < node.keys.length && key > node.keys[i]) {
        i++;
      }
    }

    this._delete(node.children[i], key);
  }

  private getPredecessor(node: BTreeNode<T>, index: number): { key: string, value: T } {
    let curr = node.children[index];
    while (!curr.isLeaf) {
      curr = curr.children[curr.children.length - 1];
    }
    return { key: curr.keys[curr.keys.length - 1], value: curr.values[curr.values.length - 1] };
  }

  private getSuccessor(node: BTreeNode<T>, index: number): { key: string, value: T } {
    let curr = node.children[index + 1];
    while (!curr.isLeaf) {
      curr = curr.children[0];
    }
    return { key: curr.keys[0], value: curr.values[0] };
  }

  private fill(parent: BTreeNode<T>, index: number) {
    const minKeys = Math.ceil(this.degree / 2) - 1;

    if (index > 0 && parent.children[index - 1].keys.length > minKeys) {
      this.borrowFromPrev(parent, index);
    } else if (index < parent.children.length - 1 && parent.children[index + 1].keys.length > minKeys) {
      this.borrowFromNext(parent, index);
    } else {
      if (index < parent.children.length - 1) {
        const leftChild = parent.children[index];
        const rightChild = parent.children[index + 1];
        const key = parent.keys[index];
        const leftKeys = [...leftChild.keys];
        const rightKeys = [...rightChild.keys];
        this.merge(parent, index);
        this.addStep({ 
          type: 'merge', 
          leftId: leftChild.id, 
          rightId: rightChild.id, 
          parentId: parent.id, 
          description: `Cả hai node con đều ở mức tối thiểu. Gộp node con [${leftKeys.join(', ')}] và [${rightKeys.join(', ')}] cùng với khóa ${key} từ cha.` 
        });
      } else {
        const leftChild = parent.children[index - 1];
        const rightChild = parent.children[index];
        const key = parent.keys[index - 1];
        const leftKeys = [...leftChild.keys];
        const rightKeys = [...rightChild.keys];
        this.merge(parent, index - 1);
        this.addStep({ 
          type: 'merge', 
          leftId: leftChild.id, 
          rightId: rightChild.id, 
          parentId: parent.id, 
          description: `Cả hai node con đều ở mức tối thiểu. Gộp node con [${leftKeys.join(', ')}] và [${rightKeys.join(', ')}] cùng với khóa ${key} từ cha.` 
        });
      }
    }
  }

  private borrowFromPrev(parent: BTreeNode<T>, index: number) {
    const child = parent.children[index];
    const sibling = parent.children[index - 1];
    const parentKey = parent.keys[index - 1];
    const siblingKey = sibling.keys[sibling.keys.length - 1];

    child.keys.unshift(parent.keys[index - 1]);
    child.values.unshift(parent.values[index - 1]);
    if (!child.isLeaf) {
      child.children.unshift(sibling.children.pop()!);
    }

    parent.keys[index - 1] = sibling.keys.pop()!;
    parent.values[index - 1] = sibling.values.pop()!;

    this.addStep({ 
      type: 'borrow', 
      fromId: sibling.id, 
      toId: child.id, 
      key: parent.keys[index - 1], 
      description: `Mượn khóa ${parentKey} từ cha xuống node con, đồng thời đưa khóa ${siblingKey} từ anh em bên trái lên thay thế ở cha.` 
    });
  }

  private borrowFromNext(parent: BTreeNode<T>, index: number) {
    const child = parent.children[index];
    const sibling = parent.children[index + 1];
    const parentKey = parent.keys[index];
    const siblingKey = sibling.keys[0];

    child.keys.push(parent.keys[index]);
    child.values.push(parent.values[index]);
    if (!child.isLeaf) {
      child.children.push(sibling.children.shift()!);
    }

    parent.keys[index] = sibling.keys.shift()!;
    parent.values[index] = sibling.values.shift()!;

    this.addStep({ 
      type: 'borrow', 
      fromId: sibling.id, 
      toId: child.id, 
      key: parent.keys[index], 
      description: `Mượn khóa ${parentKey} từ cha xuống node con, đồng thời đưa khóa ${siblingKey} từ anh em bên phải lên thay thế ở cha.` 
    });
  }

  private merge(parent: BTreeNode<T>, index: number) {
    const child = parent.children[index];
    const sibling = parent.children[index + 1];

    child.keys.push(parent.keys[index]);
    child.values.push(parent.values[index]);
    child.keys.push(...sibling.keys);
    child.values.push(...sibling.values);
    if (!child.isLeaf) {
      child.children.push(...sibling.children);
    }

    parent.keys.splice(index, 1);
    parent.values.splice(index, 1);
    parent.children.splice(index + 1, 1);
    
    // Note: addStep is called by the caller of merge to provide better context
  }

  traverseAll(): { key: string, value: T }[] {
    const result: { key: string, value: T }[] = [];
    this.traverse(this.root, (key, value) => {
      result.push({ key, value });
    });
    return result;
  }

  private traverse(node: BTreeNode<T>, callback: (key: string, value: T) => void) {
    for (let i = 0; i < node.keys.length; i++) {
      if (!node.isLeaf) this.traverse(node.children[i], callback);
      callback(node.keys[i], node.values[i]);
    }
    if (!node.isLeaf) this.traverse(node.children[node.children.length - 1], callback);
  }

  contains(key: string, node: BTreeNode<T> = this.root): boolean {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) {
      i++;
    }

    if (i < node.keys.length && key === node.keys[i]) {
      return true;
    }

    if (node.isLeaf) {
      return false;
    }

    return this.contains(key, node.children[i]);
  }

  clone(): BTree<T> {
    const newTree = new BTree<T>(this.degree);
    newTree.root = this.cloneNode(this.root);
    return newTree;
  }

  private cloneNode(node: BTreeNode<T>): BTreeNode<T> {
    const newNode = new BTreeNode<T>(node.isLeaf);
    newNode.id = node.id; // Keep IDs for stable animation
    newNode.keys = [...node.keys];
    newNode.values = [...node.values];
    newNode.children = node.children.map((child) => this.cloneNode(child));
    return newNode;
  }
}
