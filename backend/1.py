import sys
from math import log2

input = sys.stdin.readline

def solve(N, R, M, edges, Q, queries):
    adj = [[] for _ in range(N + 1)]
    em = {}

    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))
        em[(min(u, v), max(u, v))] = w

    LOG = max(1, int(log2(N)) + 1) if N > 1 else 1

    par = [0] * (N + 1)
    dep = [0] * (N + 1)
    wt = [0] * (N + 1)
    sz = [1] * (N + 1)
    hvy = [-1] * (N + 1)
    up = [[0] * (N + 1) for _ in range(LOG)]

    order = []
    vis = [False] * (N + 1)
    stk = [(R, 0, 0)]
    while stk:
        nd, p, w = stk.pop()
        if vis[nd]:
            continue
        vis[nd] = True
        par[nd] = p
        wt[nd] = w
        up[0][nd] = p
        order.append(nd)
        for nb, ew in adj[nd]:
            if not vis[nb]:
                dep[nb] = dep[nd] + 1
                stk.append((nb, nd, ew))

    for nd in reversed(order):
        p = par[nd]
        if p != 0:
            sz[p] += sz[nd]

    for nd in order:
        best, bs = -1, 0
        for nb, _ in adj[nd]:
            if nb != par[nd] and sz[nb] > bs:
                bs = sz[nb]
                best = nb
        hvy[nd] = best

    head = [0] * (N + 1)
    pos = [0] * (N + 1)
    cp = [0]

    def assign(root):
        stk = [(root, root)]
        while stk:
            nd, h = stk.pop()
            head[nd] = h
            pos[nd] = cp[0]
            cp[0] += 1
            lc = []
            for nb, _ in adj[nd]:
                if nb != par[nd] and nb != hvy[nd]:
                    lc.append(nb)
            for c in lc:
                stk.append((c, c))
            if hvy[nd] != -1:
                stk.append((hvy[nd], h))

    assign(R)

    for k in range(1, LOG):
        for v in range(1, N + 1):
            up[k][v] = up[k - 1][up[k - 1][v]]

    s = cp[0]
    bit = [0] * (s + 2)

    def upd(i, d):
        i += 1
        while i <= s:
            bit[i] += d
            i += i & (-i)

    def qry(i):
        i += 1
        r = 0
        while i > 0:
            r += bit[i]
            i -= i & (-i)
        return r

    def rng(l, r):
        if l > r:
            return 0
        return qry(r) - (qry(l - 1) if l > 0 else 0)

    for nd in range(1, N + 1):
        if nd != R:
            upd(pos[nd], wt[nd])

    def pq(a, b):
        res = 0
        while head[a] != head[b]:
            if dep[head[a]] < dep[head[b]]:
                a, b = b, a
            res += rng(pos[head[a]], pos[a])
            a = par[head[a]]
        if a == b:
            return res
        if dep[a] > dep[b]:
            a, b = b, a
        res += rng(pos[a] + 1, pos[b])
        return res

    def ue(u, v, nw):
        c = v if par[v] == u else u
        k = (min(u, v), max(u, v))
        upd(pos[c], nw - em[k])
        em[k] = nw
        wt[c] = nw

    tot = 0
    for q in queries:
        if q[0] == 1:
            tot += pq(q[1], q[2])
        else:
            ue(q[1], q[2], q[3])

    return tot


def main():
    N = int(sys.stdin.readline().strip())
    R = int(sys.stdin.readline().strip())
    M = int(sys.stdin.readline().strip())

    edges = []
    for _ in range(M):
        edges.append(
            list(map(lambda x: int(x), sys.stdin.readline().strip().split(" ")))
        )

    Q = int(sys.stdin.readline().strip())

    queries = []
    for _ in range(Q):
        queries.append(
            list(map(lambda x: int(x), sys.stdin.readline().strip().split(" ")))
        )

    print(solve(N, R, M, edges, Q, queries))


if __name__ == "__main__":
    main()