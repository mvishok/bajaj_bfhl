export function isValidEntry(s: string): boolean {
    return /^[A-Z]->[A-Z]$/.test(s) && s[0] !== s[3];
}

export function buildHierarchies(edges: string[]) {
    const children: Map<string, Set<string>> = new Map();
    const parentOf: Map<string, string> = new Map();
    const allNodes = new Set<string>();

    for (const e of edges) {
        const [p, c] = e.split("->");
        if (parentOf.has(c)) continue;
        allNodes.add(p);
        allNodes.add(c);
        if (!parentOf.has(c)) {
            parentOf.set(c, p);
            if (!children.has(p)) children.set(p, new Set());
            children.get(p)!.add(c);
        }
    }

    const nodesWithChildren = new Set(children.keys());
    const roots = [...allNodes].filter((n) => !parentOf.has(n) && nodesWithChildren.has(n)).sort();
    const visited = new Set<string>();
    const groups: string[][] = [];

    function bfsGroup(start: string): string[] {
        const q = [start];
        const group: string[] = [];
        while (q.length) {
            const n = q.shift()!;
            if (visited.has(n)) continue;
            visited.add(n);
            group.push(n);
            for (const c of children.get(n) ?? []) q.push(c);
        }
        return group;
    }

    for (const r of roots) bfsGroup(r).forEach((n) => groups.push([n]));
    visited.clear();

    function buildTree(node: string): object {
        const kids = children.get(node) ?? new Set();
        const obj: Record<string, object> = {};
        for (const c of [...kids].sort()) {
            obj[c] = buildTree(c);
        }
        return obj;
    }

    function depth(node: string): number {
        const kids = [...(children.get(node) ?? [])];
        if (!kids.length) return 1;
        return 1 + Math.max(...kids.map(depth));
    }

    function hasCycle(node: string, path: Set<string>): boolean {
        if (path.has(node)) return true;
        path.add(node);
        for (const c of children.get(node) ?? []) {
            if (hasCycle(c, new Set(path))) return true;
        }
        return false;
    }

    const hierarchies: object[] = [];

    for (const root of roots) {
        const cycle = hasCycle(root, new Set());
        if (cycle) {
            hierarchies.push({ root, tree: {}, has_cycle: true });
        } else {
            const tree = { [root]: buildTree(root) };
            hierarchies.push({ root, tree, depth: depth(root) });
        }
        visited.add(root);
    }

    const reachable = new Set<string>();
    function reach(n: string) {
        if (reachable.has(n)) return;
        reachable.add(n);
        for (const c of children.get(n) ?? []) reach(c);
    }
    roots.forEach(reach);

    const unreached = [...allNodes].filter((n) => !reachable.has(n));
    const adjUndirected: Map<string, Set<string>> = new Map();
    for (const n of unreached) adjUndirected.set(n, new Set());
    for (const e of edges) {
        const [p, c] = e.split("->");
        const unreachedSet = new Set(unreached);

        if (unreachedSet.has(p) && unreachedSet.has(c)) {
            adjUndirected.get(p)?.add(c);
            adjUndirected.get(c)?.add(p);
        }
    }
    const unreachedVisited = new Set<string>();
    for (const n of unreached) {
        if (unreachedVisited.has(n)) continue;
        const comp: string[] = [];
        const q = [n];
        while (q.length) {
            const cur = q.shift()!;
            if (unreachedVisited.has(cur)) continue;
            unreachedVisited.add(cur);
            comp.push(cur);
            for (const nb of adjUndirected.get(cur) ?? []) q.push(nb);
        }
        const root = comp.sort()[0];
        hierarchies.push({ root, tree: {}, has_cycle: true });
    }

    return hierarchies;
}
