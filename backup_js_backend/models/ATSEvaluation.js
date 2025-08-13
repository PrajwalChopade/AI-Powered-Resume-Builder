import mongoose from 'mongoose';

const ATSEvaluationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: false // Can be null if user uploads resume directly
  },
  resumeContent: {
    type: String,
    required: true
  },
  jobDescription: {
    type: String,
    required: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: false
  },
  // ATS Evaluation Results
  atsScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  matchedSkills: [{
    type: String
  }],
  missingSkills: [{
    type: String
  }],
  gapAnalysis: [{
    type: String
  }],
  // Additional Analysis
  keywordDensity: {
    type: Number,
    default: 0
  },
  skillsMatch: {
    type: Number,
    default: 0
  },
  experienceMatch: {
    type: Number,
    default: 0
  },
  // Raw Gemini Response
  rawGeminiResponse: {
    type: String,
    required: false
  },
  // Metadata
  evaluationStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index for faster queries
ATSEvaluationSchema.index({ user: 1, createdAt: -1 });
ATSEvaluationSchema.index({ atsScore: -1 });
ATSEvaluationSchema.index({ evaluationStatus: 1 });

// Virtual for formatted score
ATSEvaluationSchema.virtual('formattedScore').get(function() {
  return `${this.atsScore}/100`;
});

// Method to get evaluation summary
ATSEvaluationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    jobTitle: this.jobTitle,
    companyName: this.companyName,
    atsScore: this.atsScore,
    matchedSkillsCount: this.matchedSkills.length,
    missingSkillsCount: this.missingSkills.length,
    evaluatedAt: this.createdAt,
    status: this.evaluationStatus
  };
};

// Static method to get user's evaluation history
ATSEvaluationSchema.statics.getUserHistory = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('jobTitle companyName atsScore matchedSkills missingSkills createdAt evaluationStatus');
};

// Static method to get average ATS score for user
ATSEvaluationSchema.statics.getUserAverageScore = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), evaluationStatus: 'completed' } },
    { $group: { _id: null, avgScore: { $avg: '$atsScore' }, count: { $sum: 1 } } }
  ]);
  
  return result.length > 0 ? {
    averageScore: Math.round(result[0].avgScore),
    totalEvaluations: result[0].count
  } : { averageScore: 0, totalEvaluations: 0 };
};

export default mongoose.model('ATSEvaluation', ATSEvaluationSchema);
