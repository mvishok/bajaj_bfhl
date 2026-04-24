import { NextRequest, NextResponse } from "next/server";
import { USER_ID, EMAIL_ID, COLLEGE_ROLL_NUMBER } from "@/utils/constants";
import { isValidEntry, buildHierarchies } from "@/utils/hierarchy";

export async function POST(req: NextRequest) {
    try {
        let body;

        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 }
            );
        }

        if (!body || !Array.isArray(body.data)) {
            return NextResponse.json(
                { error: "`data` must be an array of strings" },
                { status: 400 }
            );
        }

        const data: string[] = body.data;

        const invalid_entries: string[] = [];
        const duplicate_edges: string[] = [];
        const seenEdges = new Set<string>();
        const validEdges: string[] = [];

        for (const raw of data) {
            if (typeof raw !== "string") {
                invalid_entries.push(String(raw));
                continue;
            }

            const entry = raw.trim();

            if (!isValidEntry(entry)) {
                invalid_entries.push(raw);
                continue;
            }

            if (seenEdges.has(entry)) {
                if (!duplicate_edges.includes(entry)) duplicate_edges.push(entry);
            } else {
                seenEdges.add(entry);
                validEdges.push(entry);
            }
        }

        const hierarchies = buildHierarchies(validEdges) as Array<{
            root: string;
            tree: object;
            depth?: number;
            has_cycle?: boolean;
        }>;

        const nonCyclic = hierarchies.filter((h) => !h.has_cycle);
        const total_trees = nonCyclic.length;
        const total_cycles = hierarchies.filter((h) => h.has_cycle).length;

        let largest_tree_root = "";
        let maxDepth = -1;

        for (const h of nonCyclic) {
            const d = h.depth ?? 0;
            if (
                d > maxDepth ||
                (d === maxDepth && h.root < largest_tree_root)
            ) {
                maxDepth = d;
                largest_tree_root = h.root;
            }
        }

        return NextResponse.json({
            user_id: USER_ID,
            email_id: EMAIL_ID,
            college_roll_number: COLLEGE_ROLL_NUMBER,
            hierarchies,
            invalid_entries,
            duplicate_edges,
            summary: { total_trees, total_cycles, largest_tree_root },
        });

    } catch (err) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}