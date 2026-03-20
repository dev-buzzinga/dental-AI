import React from 'react';
import './CampaignWizard.css';

const Stepper = ({ currentStep, steps }) => {
    return (
        <div className="wizard-stepper">
            <div className="stepper-line"></div>
            {steps.map((step, index) => {
                const stepNum = index + 1;
                const isCompleted = currentStep > stepNum;
                const isActive = currentStep === stepNum;
                const isFuture = currentStep < stepNum;

                return (
                    <div key={stepNum} className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}`}>
                        <div className="stepper-circle">
                            {isCompleted ? (
                                <i className="fas fa-check" />
                            ) : (
                                <span>{stepNum}</span>
                            )}
                        </div>
                        <span className="stepper-label">{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default Stepper;
