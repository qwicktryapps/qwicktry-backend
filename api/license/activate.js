import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ valid: false, reason: "Method not allowed" });
  }

  const { licenseKey, employeeId } = req.body;

  // Basic validation
  if (!licenseKey || !employeeId) {
    return res.status(400).json({ valid: false, reason: "License key and Employee ID are required" });
  }

  // Look up the license
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key", licenseKey)
    .single();

  if (error || !data) {
    return res.status(200).json({ valid: false, reason: "License key not found" });
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return res.status(200).json({ valid: false, reason: "Your subscription has expired. Please renew to continue." });
  }

  // Check if canceled
  if (data.status !== "active") {
    return res.status(200).json({ valid: false, reason: "This license is no longer active." });
  }

  // Check employee ID binding
  if (data.employee_id && data.employee_id !== employeeId) {
    return res.status(200).json({ valid: false, reason: "This license is linked to a different Employee ID. Please contact support@qwicktry.com" });
  }

  // First time use — bind employee ID
  if (!data.employee_id) {
    const { error: updateError } = await supabase
      .from("licenses")
      .update({ employee_id: employeeId })
      .eq("license_key", licenseKey);

    if (updateError) {
      return res.status(500).json({ valid: false, reason: "Could not activate license. Please try again." });
    }
  }

  // All good
  return res.status(200).json({
    valid: true,
    expiresAt: data.expires_at
  });
}
