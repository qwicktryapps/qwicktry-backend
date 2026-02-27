import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ valid: false, reason: "Method not allowed" });
  }

  const { licenseKey, employeeId } = req.body;

  if (!licenseKey || !employeeId) {
    return res.status(400).json({ valid: false, reason: "License key and Employee ID are required" });
  }

  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key", licenseKey)
    .eq("employee_id", employeeId)
    .single();

  if (error || !data) {
    return res.status(200).json({ valid: false, reason: "License not found" });
  }

  if (new Date(data.expires_at) < new Date()) {
    return res.status(200).json({ valid: false, reason: "Subscription expired" });
  }

  if (data.status !== "active") {
    return res.status(200).json({ valid: false, reason: "License inactive" });
  }

  return res.status(200).json({
    valid: true,
    expiresAt: data.expires_at
  });
}
