import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { UploadCloud, X, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

const INCIDENT_TYPES = ["Medical", "Theft", "Loss", "Damage", "Cancellation", "Delay", "Other"];

export default function FileClaim() {
  const { policyId } = useParams();
  const nav = useNavigate();
  const { format, code } = useCurrency();
  const [step, setStep] = useState(1);
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState({
    incident_date: "",
    incident_type: "Medical",
    description: "",
    amount_claimed: "",
    documents: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/policies/${policyId}`).then((r) => setPolicy(r.data));
  }, [policyId]);

  const addDoc = (name) => {
    if (!name) return;
    setForm((f) => ({ ...f, documents: [...f.documents, name] }));
  };

  const removeDoc = (i) => setForm((f) => ({ ...f, documents: f.documents.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    setLoading(true);
    try {
      const r = await api.post("/claims", {
        policy_id: policyId,
        incident_date: form.incident_date,
        incident_type: form.incident_type,
        description: form.description,
        amount_claimed: parseFloat(form.amount_claimed),
        documents: form.documents,
      });
      toast.success(`Claim ${r.data.claim_number} submitted — status: ${r.data.status}`);
      setTimeout(() => nav("/claims"), 1200);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="file-claim-page">
      <div className="mb-8">
        <div className="text-xs text-primary-700 uppercase tracking-widest font-semibold">File a claim</div>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Let's make this easy.</h1>
        {policy && (
          <div className="mt-2 text-sm text-gray-500">
            Against <span className="font-mono">{policy.policy_number}</span> · {policy.product_name}
          </div>
        )}
        <Progress value={(step / 4) * 100} className="mt-6 h-1.5" />
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <Label htmlFor="inc-date">Incident date</Label>
              <Input
                id="inc-date"
                data-testid="claim-date"
                type="date"
                value={form.incident_date}
                onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
                className="rounded-xl h-12"
              />
            </div>
            <div>
              <Label>Incident type</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {INCIDENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, incident_type: t })}
                    data-testid={`incident-${t.toLowerCase()}`}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      form.incident_type === t
                        ? "bg-primary text-white shadow-float"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => setStep(2)}
              data-testid="claim-step1-next"
              disabled={!form.incident_date}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <Label htmlFor="desc">What happened?</Label>
              <Textarea
                id="desc"
                data-testid="claim-description"
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl"
                placeholder="Brief description of the incident..."
              />
            </div>
            <div>
              <Label htmlFor="amt">Amount claimed ({code})</Label>
              <Input
                id="amt"
                data-testid="claim-amount"
                type="number"
                value={form.amount_claimed}
                onChange={(e) => setForm({ ...form, amount_claimed: e.target.value })}
                className="rounded-xl h-12"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 h-12 rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                data-testid="claim-step2-next"
                disabled={!form.description || !form.amount_claimed}
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <Label>Upload supporting documents</Label>
              <p className="text-xs text-gray-500 mb-2">Receipts, reports, photos (names are stored — files are mocked for demo).</p>
              <label
                htmlFor="doc-upload"
                data-testid="claim-doc-upload"
                className="block border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary-50/30 transition-colors"
              >
                <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <div className="font-medium text-sm">Click to add a document</div>
                <div className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</div>
                <input
                  id="doc-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addDoc(f.name);
                    e.target.value = "";
                  }}
                />
              </label>
              {form.documents.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {form.documents.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-xl text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="flex-1 truncate">{d}</span>
                      <button onClick={() => removeDoc(i)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1 h-12 rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                data-testid="claim-step3-next"
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
              >
                Review <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="font-display text-xl font-semibold">Review & submit</h3>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Policy</span><span className="font-mono font-medium">{policy?.policy_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Incident date</span><span>{form.incident_date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Incident type</span><span>{form.incident_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-semibold">{format(parseFloat(form.amount_claimed || 0))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Documents</span><span>{form.documents.length}</span></div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(3)} variant="outline" className="flex-1 h-12 rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={submit}
                disabled={loading}
                data-testid="claim-submit-btn"
                className="flex-1 h-12 rounded-full bg-primary hover:bg-primary-600 text-white shadow-float"
              >
                {loading ? "Submitting..." : "Submit claim"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
