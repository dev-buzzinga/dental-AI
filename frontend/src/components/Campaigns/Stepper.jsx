import React from 'react';
import './Stepper.css';

const Stepper = ({ currentStep, steps }) => {
    return (
        <div className="wizard-stepper">
            <div className="stepper-progress-container">
                <div 
                    className="stepper-progress-line" 
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>
                <div className="stepper-line-bg"></div>
            </div>
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
