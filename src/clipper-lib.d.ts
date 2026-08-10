declare module 'clipper-lib' {
    export type Path = Array<{ X: number; Y: number }>;
    export type Paths = Path[];

    export const Clipper: {
        new (): {
            AddPath(
                path: Path,
                polyType: number,
                closed: boolean
            ): void;
            AddPaths(
                paths: Paths,
                polyType: number,
                closed: boolean
            ): void;
            Execute(
                clipType: number,
                solution: Paths,
                subjFillType?: number,
                clipFillType?: number
            ): boolean;
        };
    };

    export const ClipperOffset: {
        new (): {
            AddPath(
                path: Path,
                joinType: number,
                endType: number
            ): void;
            AddPaths(
                paths: Paths,
                joinType: number,
                endType: number
            ): void;
            Execute(solution: Paths, delta: number): void;
        };
    };

    export const JoinType: {
        jtSquare: number;
        jtRound: number;
        jtMiter: number;
    };

    export const EndType: {
        etOpenSquare: number;
        etOpenRound: number;
        etOpenButt: number;
        etClosedLine: number;
        etClosedPolygon: number;
    };

    export const ClipType: {
        ctIntersection: number;
        ctUnion: number;
        ctDifference: number;
        ctXor: number;
    };

    export const PolyType: {
        ptSubject: number;
        ptClip: number;
    };

    export const PolyFillType: {
        pftEvenOdd: number;
        pftNonZero: number;
        pftPositive: number;
        pftNegative: number;
    };
}
