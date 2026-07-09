// Optical Clinic Configuration Constants
// Centralized file for managing operational and optometric rules.

export const CLINIC_CONFIG = {
  // Available prescription validity options (in months)
  validityPeriods: [
    { value: 6, label: '6 Months' },
    { value: 12, label: '12 Months (1 Year)' },
    { value: 24, label: '24 Months (2 Years)' }
  ],
  
  // Standard optometric validation limits
  validationLimits: {
    sphere: { min: -30.0, max: 30.0, step: 0.25 },
    cylinder: { min: -10.0, max: 10.0, step: 0.25 },
    axis: { min: 0, max: 180, step: 1 },
    pd: { min: 40, max: 80, step: 1 }
  },

  // Automated notification and scheduling parameters
  scheduling: {
    slotDurationMinutes: 30,
    leadTimeDays: 7 // default checkup warning threshold
  }
};
