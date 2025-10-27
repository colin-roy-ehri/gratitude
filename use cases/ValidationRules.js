// Additional validation beyond JSON schema

function validateMessage(msg) {
  // Location precision must decrease with distance from dense areas
  if (msg.public.location.precision_level === "high") {
    // Check network density score
    if (getDensityScore() < 30) {
      return {valid: false, error: "Precision too high for network density"};
    }
  }
  
  // Encrypted payloads must be padded to 256-byte increments
  for (const payload of msg.encrypted_payloads || []) {
    if (payload.payload_size % 256 !== 0 || payload.payload_size === 0) {
      return {valid: false, error: "Payload size must be a multiple of 256 bytes"};
    }
  }
  
  // Coordination messages must have at least one encrypted payload
  if (msg.type === "COORDINATION" && (!msg.encrypted_payloads || msg.encrypted_payloads.length === 0)) {
    return {valid: false, error: "COORDINATION messages must have encrypted payloads"};
  }
  
  // NEED/OFFER messages must have category
  if ((msg.type === "NEED" || msg.type === "OFFER") && !msg.public.category) {
    return {valid: false, error: "NEED/OFFER messages must have category"};
  }
  
  return {valid: true};
}


// ### Size Constraints
// Target message sizes:
// - NEED/OFFER (no encrypted payloads): ~1 KB
// - COORDINATION (1-2 encrypted payloads): ~2-3 KB
// - COORDINATION (multiple payloads): ~4-5 KB
// - COMPLETION: ~500 bytes

// Maximum message size: 10 KB (BLE MTU considerations)