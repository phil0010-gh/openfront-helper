import React from "react";
import { createRoot, type Root } from "react-dom/client";

type TeamRow = { team: string; value: string; color: string };
type TopRow = { rank: string; name: string; value: string; color?: string };
type TradeRow = { partnerName: string; total: string; direction: string };
type TradeView = {
  imports: string;
  exports: string;
  factoryPortSpend: string;
  roi: string;
  roiStatus: string;
  breakEven: string;
  rows: TradeRow[] | null;
};

const roots = new WeakMap<HTMLElement, Root>();

function getRoot(el: HTMLElement): Root {
  let r = roots.get(el);
  if (!r) {
    r = createRoot(el);
    roots.set(el, r);
  }
  return r;
}

function PlayerGpmView(props: { valueText: string }) {
  return (
    <>
      <span className="openfront-helper-gpm-label">Gold per minute</span>
      <span className="openfront-helper-gpm-value">{props.valueText}</span>
    </>
  );
}

function TeamGpmView(props: { rows: TeamRow[] }) {
  return (
    <>
      <span className="openfront-helper-team-gpm-title">Team gold per minute</span>
      <span className="openfront-helper-team-gpm-rows">
        {props.rows.map((r) => (
          <span
            key={r.team}
            className="openfront-helper-team-gpm-row"
            style={{ ["--team-accent-color" as string]: r.color }}
          >
            <span className="openfront-helper-team-gpm-name">{r.team}</span>
            <span className="openfront-helper-team-gpm-value">{r.value}</span>
          </span>
        ))}
      </span>
    </>
  );
}

function TopGpmView(props: { rows: TopRow[] | null }) {
  return (
    <>
      <span className="openfront-helper-top-gpm-title">Top 10 gold per minute</span>
      <span className="openfront-helper-top-gpm-rows">
        {props.rows == null || props.rows.length === 0 ? (
          <span className="openfront-helper-top-gpm-empty">Tracking player income</span>
        ) : (
          props.rows.map((r) => (
            <span
              key={`${r.rank}-${r.name}`}
              className="openfront-helper-top-gpm-row"
              style={
                r.color
                  ? { ["--team-accent-color" as string]: r.color }
                  : undefined
              }
            >
              <span className="openfront-helper-top-gpm-rank">{r.rank}</span>
              <span className="openfront-helper-top-gpm-name">{r.name}</span>
              <span className="openfront-helper-top-gpm-value">{r.value}</span>
            </span>
          ))
        )}
      </span>
    </>
  );
}

function TradeBalanceView(props: { data: TradeView }) {
  const { data } = props;
  return (
    <>
      <span className="openfront-helper-trade-title">Trade balance</span>
      <span className="openfront-helper-trade-summary">
        <span className="openfront-helper-trade-total">
          <span className="openfront-helper-trade-total-label">Total imports</span>
          <span className="openfront-helper-trade-total-value openfront-helper-trade-imports">
            {data.imports}
          </span>
        </span>
        <span className="openfront-helper-trade-total">
          <span className="openfront-helper-trade-total-label">Total exports</span>
          <span className="openfront-helper-trade-total-value openfront-helper-trade-exports">
            {data.exports}
          </span>
        </span>
        <span className="openfront-helper-trade-total">
          <span className="openfront-helper-trade-total-label">Factory/port spent</span>
          <span className="openfront-helper-trade-total-value openfront-helper-trade-factory-port-spend">
            {data.factoryPortSpend}
          </span>
        </span>
        <span className="openfront-helper-trade-total">
          <span className="openfront-helper-trade-total-label">Return on investment</span>
          <span
            className="openfront-helper-trade-total-value openfront-helper-trade-roi"
            data-status={data.roiStatus}
          >
            {data.roi}
          </span>
        </span>
        <span className="openfront-helper-trade-total">
          <span className="openfront-helper-trade-total-label">Break even</span>
          <span className="openfront-helper-trade-total-value openfront-helper-trade-break-even">
            {data.breakEven}
          </span>
        </span>
      </span>
      <span className="openfront-helper-trade-rows">
        {data.rows == null || data.rows.length === 0 ? (
          <span className="openfront-helper-trade-empty">No observed trade yet</span>
        ) : (
          data.rows.map((row) => (
            <span key={row.partnerName} className="openfront-helper-trade-row">
              <span className="openfront-helper-trade-name">{row.partnerName}</span>
              <span className="openfront-helper-trade-value-wrap">
                <span className="openfront-helper-trade-value">{row.total}</span>
                <span className="openfront-helper-trade-direction">{row.direction}</span>
              </span>
            </span>
          ))
        )}
      </span>
    </>
  );
}

type OverlayApi = {
  renderPlayerGpm: (badge: HTMLElement, props: { valueText: string }) => void;
  renderTeamGpm: (badge: HTMLElement, rows: TeamRow[]) => void;
  renderTopGpm: (badge: HTMLElement, rows: TopRow[] | null) => void;
  renderTradeBalance: (badge: HTMLElement, data: TradeView) => void;
};

const api: OverlayApi = {
  renderPlayerGpm(badge, props) {
    getRoot(badge).render(<PlayerGpmView valueText={props.valueText} />);
  },
  renderTeamGpm(badge, rows) {
    getRoot(badge).render(<TeamGpmView rows={rows} />);
  },
  renderTopGpm(badge, rows) {
    getRoot(badge).render(<TopGpmView rows={rows} />);
  },
  renderTradeBalance(badge, data) {
    getRoot(badge).render(<TradeBalanceView data={data} />);
  },
};

(globalThis as unknown as { OpenFrontHelperOverlays: OverlayApi }).OpenFrontHelperOverlays = api;
