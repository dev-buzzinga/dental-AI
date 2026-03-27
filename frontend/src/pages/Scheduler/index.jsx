import { useContext, useEffect, useState } from 'react';
import "../../styles/scheduler.css"
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../components/Toast/Toast";

const Schedulerpage = () => {


    return (
        <div className="scheduler-page">
            <div className="scheduler-header">
                <div className="scheduler-header-left">
                    <h2 className="scheduler-title">Scheduler Web Page</h2>
                </div>
            </div>
        </div>
    );
};

export default Schedulerpage;
