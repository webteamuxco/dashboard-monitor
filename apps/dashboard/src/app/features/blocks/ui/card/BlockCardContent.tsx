import { CardContent } from "@/components/ui/card";
import {
  DashboardBlock,
  DashboardBlockType,
} from "@/lib/config/domain/DashboardBlock";
import { Level } from "@/lib/config/domain/Level";
import { ComponentType, createElement } from "react";
import { BlockMeasure } from "../../domain/BlockMeasure";
import { EmptyState } from "@/app/features/dashboard/ui/EmptyState";
import { BlockList } from "../blockType/list/blockList";
import { BlockRate } from "../blockType/rate/blockRate";
import { BlockBar, StackedBlockBar } from "../blockType/bar/blockBar";

export interface BlockBodyProps<TMeasure extends BlockMeasure = BlockMeasure> {
    blockId: string;
    measure: TMeasure;
    level: Level;
}

type ShapeOf<TType extends DashboardBlockType> = TType extends "list"
    ? "list"
    : "series";

const BLOCK_BODIES: {
    [TType in DashboardBlockType]: {
        shape: ShapeOf<TType>;
        body: ComponentType<
            BlockBodyProps<Extract<BlockMeasure, { type: ShapeOf<TType> }>>
        >;
    };
} = {
    list: { shape: "list", body: BlockList },
    rate: { shape: "series", body: BlockRate },
    bar: { shape: "series", body: BlockBar },
    stackedBar: { shape: "series", body: StackedBlockBar },
};

type BlockCardContentProps = {
    dashboardBlock: DashboardBlock,
    data: BlockMeasure | undefined,
    level: Level,
    isPending: boolean,
    isError: boolean,
    error: Error | null
}

export function BlockCardContent(
    {
        dashboardBlock,
        data,
        level,
        isPending,
        isError,
        error
    }: BlockCardContentProps
) {
    return (
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {isPending ? (
          <EmptyState>Chargement…</EmptyState>
        ) : isError ? (
          <EmptyState tone="error">
            Erreur de chargement{error instanceof Error ? ` : ${error.message}` : ""}.
          </EmptyState>
        ) : !data ? (
          <EmptyState>Aucune donnée</EmptyState>
        ) : (
          <BlockBody
            dashboardBlock={dashboardBlock}
            measure={data}
            level={level}
          />
        )}
      </CardContent>
    )
}

function BlockBody({
    dashboardBlock,
    measure,
    level,
}: {
    dashboardBlock: DashboardBlock;
    measure: BlockMeasure;
    level: Level;
}) {
    if (dashboardBlock.type === null) {
        return (
          <EmptyState tone="error">
            Ce bloc ne déclare aucun type d’affichage dans Strapi.
          </EmptyState>
        );
    }

    const { shape, body } = BLOCK_BODIES[dashboardBlock.type];

    if (measure.type !== shape) {
        return (
          <EmptyState tone="error">
            Le bloc « {dashboardBlock.type} » attend une mesure « {shape} », le
            serveur a renvoyé « {measure.type} ».
          </EmptyState>
        );
    }

    const renderer = body as ComponentType<BlockBodyProps>;

    return createElement(renderer, { blockId: dashboardBlock.id, measure, level });
}
