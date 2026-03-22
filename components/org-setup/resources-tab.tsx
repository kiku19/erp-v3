"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Pencil, X, Wrench, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useOrgSetup, generateId } from "./context";
import {
  type Equipment,
  type Material,
  type EquipmentCategory,
  type OwnershipType,
  type BillingType,
  type MaterialCategory,
  type UOM,
  type CostBasis,
} from "./types";

/* ─────────────────────── Options ────────────────────────────────── */

const EQUIPMENT_CATEGORY_OPTIONS = [
  { value: "safety", label: "Safety" },
  { value: "power-tool", label: "Power Tool" },
  { value: "hand-tool", label: "Hand Tool" },
  { value: "machinery", label: "Machinery" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
];

const OWNERSHIP_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "rented", label: "Rented" },
  { value: "leased", label: "Leased" },
];

const BILLING_OPTIONS = [
  { value: "daily-rental", label: "Daily Rental" },
  { value: "hourly-rental", label: "Hourly Rental" },
  { value: "pay-per-use", label: "Pay per Use" },
  { value: "owned-internal", label: "Owned (Internal)" },
  { value: "fixed-hire", label: "Fixed Hire" },
];

const MATERIAL_CATEGORY_OPTIONS = [
  { value: "consumable", label: "Consumable" },
  { value: "raw-material", label: "Raw Material" },
  { value: "component", label: "Component" },
  { value: "chemical", label: "Chemical" },
];

const UOM_OPTIONS = [
  { value: "litre", label: "Litre" },
  { value: "kg", label: "Kg" },
  { value: "bag", label: "Bag" },
  { value: "piece", label: "Piece" },
  { value: "m2", label: "m\u00B2" },
  { value: "m3", label: "m\u00B3" },
  { value: "box", label: "Box" },
  { value: "roll", label: "Roll" },
  { value: "set", label: "Set" },
];

const COST_BASIS_OPTIONS = [
  { value: "fixed", label: "Fixed" },
  { value: "market-rate", label: "Market Rate" },
  { value: "contract-rate", label: "Contract Rate" },
];

const BILLING_UNIT: Record<BillingType, string> = {
  "daily-rental": "/day",
  "hourly-rental": "/hr",
  "pay-per-use": "/unit",
  "owned-internal": "/day",
  "fixed-hire": "(flat fee)",
};

/* ─────────────────────── Component ─────────────────────────────── */

interface ResourcesTabProps {
  nodeId: string;
}

function ResourcesTab({ nodeId }: ResourcesTabProps) {
  const { state, dispatch } = useOrgSetup();
  const node = state.nodes[nodeId];

  const equipment = useMemo(
    () => Object.values(state.equipment).filter((e) => e.nodeId === nodeId),
    [state.equipment, nodeId],
  );

  const materials = useMemo(
    () => Object.values(state.materials).filter((m) => m.nodeId === nodeId),
    [state.materials, nodeId],
  );

  // Section state
  const [eqForm, setEqForm] = useState(false);
  const [eqEditId, setEqEditId] = useState<string | null>(null);
  const [matForm, setMatForm] = useState(false);
  const [matEditId, setMatEditId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Equipment Section */}
      <EquipmentSection
        nodeId={nodeId}
        nodeName={node?.name ?? ""}
        equipment={equipment}
        showForm={eqForm}
        editId={eqEditId}
        onShowForm={() => { setEqForm(true); setEqEditId(null); }}
        onEdit={(id) => { setEqForm(true); setEqEditId(id); }}
        onCancel={() => { setEqForm(false); setEqEditId(null); }}
        state={state}
        dispatch={dispatch}
      />

      <div className="h-px bg-border" />

      {/* Materials Section */}
      <MaterialsSection
        nodeId={nodeId}
        nodeName={node?.name ?? ""}
        materials={materials}
        showForm={matForm}
        editId={matEditId}
        onShowForm={() => { setMatForm(true); setMatEditId(null); }}
        onEdit={(id) => { setMatForm(true); setMatEditId(id); }}
        onCancel={() => { setMatForm(false); setMatEditId(null); }}
        state={state}
        dispatch={dispatch}
      />
    </div>
  );
}

/* ─────────────────────── Equipment Section ──────────────────────── */

function EquipmentSection({
  nodeId, nodeName, equipment, showForm, editId,
  onShowForm, onEdit, onCancel, state, dispatch,
}: {
  nodeId: string;
  nodeName: string;
  equipment: Equipment[];
  showForm: boolean;
  editId: string | null;
  onShowForm: () => void;
  onEdit: (id: string) => void;
  onCancel: () => void;
  state: import("./types").OrgSetupState;
  dispatch: React.Dispatch<import("./context").Action>;
}) {
  const [fName, setFName] = useState("");
  const [fCode, setFCode] = useState("");
  const [fCat, setFCat] = useState<EquipmentCategory>("machinery");
  const [fOwn, setFOwn] = useState<OwnershipType>("owned");
  const [fBill, setFBill] = useState<BillingType>("daily-rental");
  const [fRate, setFRate] = useState("");
  const [fIdle, setFIdle] = useState("");
  const [fMob, setFMob] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  // Pre-fill on edit
  useMemo(() => {
    if (editId && state.equipment[editId]) {
      const eq = state.equipment[editId];
      setFName(eq.name);
      setFCode(eq.code);
      setFCat(eq.category);
      setFOwn(eq.ownershipType);
      setFBill(eq.billingType);
      setFRate(eq.standardRate.toString());
      setFIdle(eq.idleRate?.toString() ?? "");
      setFMob(eq.mobilizationCost?.toString() ?? "");
      setFStart(eq.rentalStart ?? "");
      setFEnd(eq.rentalEnd ?? "");
    } else if (!editId) {
      setFName(""); setFCode(""); setFCat("machinery"); setFOwn("owned");
      setFBill("daily-rental"); setFRate(""); setFIdle(""); setFMob("");
      setFStart(""); setFEnd("");
    }
  }, [editId, state.equipment]);

  const handleSave = useCallback(() => {
    if (!fName.trim() || !fCode.trim() || !fRate) return;
    const data: Equipment = {
      id: editId ?? generateId("eq"),
      nodeId,
      name: fName.trim(),
      code: fCode.trim().toUpperCase(),
      category: fCat,
      ownershipType: fOwn,
      billingType: fBill,
      standardRate: Number(fRate),
      idleRate: fIdle ? Number(fIdle) : null,
      mobilizationCost: fMob ? Number(fMob) : null,
      rentalStart: fStart || null,
      rentalEnd: fEnd || null,
    };
    if (editId) {
      dispatch({ type: "UPDATE_EQUIPMENT", equipmentId: editId, updates: data });
    } else {
      dispatch({ type: "ADD_EQUIPMENT", equipment: data });
    }
    onCancel();
  }, [dispatch, editId, nodeId, fName, fCode, fCat, fOwn, fBill, fRate, fIdle, fMob, fStart, fEnd, onCancel]);

  const showIdleRate = fBill === "daily-rental" || fBill === "owned-internal";
  const showRental = fOwn === "rented" || fOwn === "leased";

  if (showForm) {
    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          {editId ? "Edit Equipment" : "Add Equipment"}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Equipment Name *</label>
            <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder='e.g., "Ladder — 6m Aluminium"' autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Equipment Code *</label>
            <Input value={fCode} onChange={(e) => setFCode(e.target.value.toUpperCase())} placeholder="CIVIL-EQ-001" className="font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Category *</label>
            <Select options={EQUIPMENT_CATEGORY_OPTIONS} value={fCat} onChange={(v) => setFCat(v as EquipmentCategory)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Ownership *</label>
            <Select options={OWNERSHIP_OPTIONS} value={fOwn} onChange={(v) => setFOwn(v as OwnershipType)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Billing Type *</label>
            <Select options={BILLING_OPTIONS} value={fBill} onChange={(v) => setFBill(v as BillingType)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Rate (₹{BILLING_UNIT[fBill]}) *</label>
            <Input type="number" value={fRate} onChange={(e) => setFRate(e.target.value)} placeholder="0.00" />
          </div>
          {showIdleRate && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-foreground">Idle Rate (₹/day)</label>
              <Input type="number" value={fIdle} onChange={(e) => setFIdle(e.target.value)} placeholder="Optional" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Mobilization Cost (₹)</label>
            <Input type="number" value={fMob} onChange={(e) => setFMob(e.target.value)} placeholder="Optional" />
          </div>
          {showRental && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Rental Start</label>
                <Input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Rental End</label>
                <Input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!fName.trim() || !fCode.trim() || !fRate}>
            {editId ? "Update" : "Save Equipment"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Equipment</h4>
        <Button variant="ghost" size="sm" onClick={onShowForm}><Plus size={14} /> Add Equipment</Button>
      </div>
      {equipment.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Wrench size={24} className="text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">No equipment registered for {nodeName}.</p>
        </div>
      ) : (
        equipment.map((eq) => (
          <div key={eq.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{eq.name}</span>
              <span className="text-[12px] text-muted-foreground">
                {eq.code} · {EQUIPMENT_CATEGORY_OPTIONS.find((c) => c.value === eq.category)?.label} · ₹{eq.standardRate}{BILLING_UNIT[eq.billingType]}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(eq.id)}><Pencil size={13} /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => dispatch({ type: "REMOVE_EQUIPMENT", equipmentId: eq.id })}><X size={13} /></Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ─────────────────────── Materials Section ──────────────────────── */

function MaterialsSection({
  nodeId, nodeName, materials, showForm, editId,
  onShowForm, onEdit, onCancel, state, dispatch,
}: {
  nodeId: string;
  nodeName: string;
  materials: Material[];
  showForm: boolean;
  editId: string | null;
  onShowForm: () => void;
  onEdit: (id: string) => void;
  onCancel: () => void;
  state: import("./types").OrgSetupState;
  dispatch: React.Dispatch<import("./context").Action>;
}) {
  const [fName, setFName] = useState("");
  const [fSku, setFSku] = useState("");
  const [fCat, setFCat] = useState<MaterialCategory>("consumable");
  const [fUom, setFUom] = useState<UOM>("kg");
  const [fCost, setFCost] = useState("");
  const [fBasis, setFBasis] = useState<CostBasis>("fixed");
  const [fWaste, setFWaste] = useState("0");
  const [fLead, setFLead] = useState("");
  const [fReorder, setFReorder] = useState("");

  useMemo(() => {
    if (editId && state.materials[editId]) {
      const mat = state.materials[editId];
      setFName(mat.name); setFSku(mat.sku); setFCat(mat.category); setFUom(mat.uom);
      setFCost(mat.standardCostPerUnit.toString()); setFBasis(mat.costBasis);
      setFWaste(mat.wastageStandardPct.toString());
      setFLead(mat.leadTimeDays?.toString() ?? ""); setFReorder(mat.reorderPointQty?.toString() ?? "");
    } else if (!editId) {
      setFName(""); setFSku(""); setFCat("consumable"); setFUom("kg");
      setFCost(""); setFBasis("fixed"); setFWaste("0"); setFLead(""); setFReorder("");
    }
  }, [editId, state.materials]);

  const handleSave = useCallback(() => {
    if (!fName.trim() || !fSku.trim() || !fCost) return;
    const data: Material = {
      id: editId ?? generateId("mat"),
      nodeId,
      name: fName.trim(),
      sku: fSku.trim(),
      category: fCat,
      uom: fUom,
      standardCostPerUnit: Number(fCost),
      costBasis: fBasis,
      wastageStandardPct: Number(fWaste) || 0,
      leadTimeDays: fLead ? Number(fLead) : null,
      reorderPointQty: fReorder ? Number(fReorder) : null,
    };
    if (editId) {
      dispatch({ type: "UPDATE_MATERIAL", materialId: editId, updates: data });
    } else {
      dispatch({ type: "ADD_MATERIAL", material: data });
    }
    onCancel();
  }, [dispatch, editId, nodeId, fName, fSku, fCat, fUom, fCost, fBasis, fWaste, fLead, fReorder, onCancel]);

  const uomLabel = UOM_OPTIONS.find((u) => u.value === fUom)?.label ?? fUom;

  if (showForm) {
    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          {editId ? "Edit Material" : "Add Material"}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Material Name *</label>
            <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder='e.g., "Exterior Wall Paint — White"' autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">SKU *</label>
            <Input value={fSku} onChange={(e) => setFSku(e.target.value)} placeholder="SKU-PAI-001" className="font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Category *</label>
            <Select options={MATERIAL_CATEGORY_OPTIONS} value={fCat} onChange={(v) => setFCat(v as MaterialCategory)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Unit of Measure *</label>
            <Select options={UOM_OPTIONS} value={fUom} onChange={(v) => setFUom(v as UOM)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Cost per Unit (₹/{uomLabel}) *</label>
            <Input type="number" value={fCost} onChange={(e) => setFCost(e.target.value)} placeholder="0.00" min={0.01} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Cost Basis *</label>
            <Select options={COST_BASIS_OPTIONS} value={fBasis} onChange={(v) => setFBasis(v as CostBasis)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Wastage Standard %</label>
            <Input type="number" value={fWaste} onChange={(e) => setFWaste(e.target.value)} placeholder="0" min={0} max={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Lead Time (days)</label>
            <Input type="number" value={fLead} onChange={(e) => setFLead(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">Reorder Point Qty</label>
            <Input type="number" value={fReorder} onChange={(e) => setFReorder(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!fName.trim() || !fSku.trim() || !fCost}>
            {editId ? "Update" : "Save Material"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Materials</h4>
        <Button variant="ghost" size="sm" onClick={onShowForm}><Plus size={14} /> Add Material</Button>
      </div>
      {materials.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Package size={24} className="text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">No materials in {nodeName} catalogue.</p>
        </div>
      ) : (
        materials.map((mat) => (
          <div key={mat.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{mat.name}</span>
              <span className="text-[12px] text-muted-foreground">
                {mat.sku} · {UOM_OPTIONS.find((u) => u.value === mat.uom)?.label} · ₹{mat.standardCostPerUnit}/{mat.uom}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(mat.id)}><Pencil size={13} /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => dispatch({ type: "REMOVE_MATERIAL", materialId: mat.id })}><X size={13} /></Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export { ResourcesTab };
