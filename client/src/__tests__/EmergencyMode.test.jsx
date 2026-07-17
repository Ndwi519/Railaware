import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmergencyMode from '../components/EmergencyMode';
import React from 'react';

describe('EmergencyMode', () => {
    it('returns null if observationData is missing', () => {
        const { container } = render(<EmergencyMode observationData={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('returns null if status is not APPROACHING_STATION or AT_STATION', () => {
        const data = { awareness: { status: 'DISTANT' } };
        const { container } = render(<EmergencyMode observationData={data} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders overlay when train is approaching', () => {
        const data = { 
            awareness: { 
                status: 'APPROACHING_STATION', 
                distanceMetres: 185,
                direction: 'TOWARDS_END',
                confidence: 'HIGH'
            }
        };
        render(<EmergencyMode observationData={data} />);
        
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Approaching Target Station')).toBeInTheDocument();
        expect(screen.getByText('~185 m')).toBeInTheDocument();
        expect(screen.getByText('High Certainty')).toBeInTheDocument();
    });

    it('renders correct background for awareness overlay', () => {
        const data = { 
            awareness: { status: 'AT_STATION' }
        };
        const { container } = render(<EmergencyMode observationData={data} />);
        expect(container.firstChild).toHaveClass('bg-slate-900/95');
    });
});
