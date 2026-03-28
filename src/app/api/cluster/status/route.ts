import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { coreApi, isClusterAvailable } from "@/lib/k8s/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const available = await isClusterAvailable();
  if (!available) {
    return NextResponse.json({
      available: false,
      nodes: [],
      namespaces: [],
    });
  }

  try {
    const { body: nodeList } = await coreApi().listNode();
    const nodes = nodeList.items.map((node) => ({
      name: node.metadata?.name || "unknown",
      status: node.status?.conditions?.find((c) => c.type === "Ready")?.status === "True"
        ? "ready"
        : "not-ready",
      kubeletVersion: node.status?.nodeInfo?.kubeletVersion || "unknown",
      os: node.status?.nodeInfo?.osImage || "unknown",
      cpu: node.status?.capacity?.cpu || "0",
      memory: node.status?.capacity?.memory || "0",
    }));

    // Count pods per namespace
    const namespaceStats = [];
    for (const ns of ["aigo-dev", "aigo-prod", "aigo-workers", "aigo-system"]) {
      try {
        const { body: podList } = await coreApi().listNamespacedPod(ns);
        const running = podList.items.filter(
          (p) => p.status?.phase === "Running",
        ).length;
        namespaceStats.push({
          name: ns,
          totalPods: podList.items.length,
          runningPods: running,
        });
      } catch {
        namespaceStats.push({ name: ns, totalPods: 0, runningPods: 0 });
      }
    }

    return NextResponse.json({
      available: true,
      nodes,
      namespaces: namespaceStats,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to get cluster status", details: String(err) },
      { status: 500 },
    );
  }
}
