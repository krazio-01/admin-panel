export type FlightPlan = {
    points: [number, number, number][];
    duration: number;
    pause: number;
};

export type StripeAxis = { x: number; y: number; z: number };

export const SMOKE_STRIPES = [
    { color: '#FF9933', offset: 0.32 },
    { color: '#FFFFFF', offset: 0 },
    { color: '#138808', offset: -0.32 },
];

const LOWEST_HEIGHT = 0.15;
const HIGHEST_HEIGHT = 0.95;

function clampHeight(height: number): number {
    return Math.min(HIGHEST_HEIGHT, Math.max(LOWEST_HEIGHT, height));
}

export function planFlight(random: () => number): FlightPlan {
    const direction = random() < 0.5 ? 1 : -1;
    const startHeight = 0.2 + random() * 0.75;
    const endHeight = 0.2 + random() * 0.75;
    const middleHeight = clampHeight((startHeight + endHeight) / 2 + (random() - 0.5) * 0.5);
    const nearDepth = 16 + random() * 10;
    const farDepth = 22 + random() * 18;

    return {
        points: [
            [-1.35 * direction, startHeight, nearDepth],
            [-0.35 * direction, clampHeight(middleHeight + 0.08), (nearDepth + farDepth) / 2],
            [0.45 * direction, middleHeight, farDepth],
            [1.4 * direction, endHeight, farDepth + 6],
        ],
        duration: 2.8 + random() * 1.4,
        pause: 1.5 + random() * 2.5,
    };
}

export function orientStripeAxis<Axis extends StripeAxis>(axis: Axis): Axis {
    if (axis.y >= 0) return axis;

    axis.x = -axis.x;
    axis.y = -axis.y;
    axis.z = -axis.z;

    return axis;
}
