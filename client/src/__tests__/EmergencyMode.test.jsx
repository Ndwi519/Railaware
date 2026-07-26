import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmergencyMode from '../components/EmergencyMode';
import React from 'react';

describe('EmergencyMode', () => {
    it('returns null if observationData is missing', () => {
        const { container } = render(<EmergencyMode observationData={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('returns null if requiresProminentDisplay is false', () => {
        const data = { awareness: { requiresProminentDisplay: false } };
        const { container } = render(<EmergencyMode observationData={data} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders overlay when train requires prominent display', () => {
        const data = {
            awareness: {
                requiresProminentDisplay: true,
                distanceMetres: 185,
                direction: 'TOWARDS_END'
            },
            confidence: {
                observationConfidence: 'HIGH',
                providerReliability: 'MEDIUM',
                topologyConfidence: 'HIGH'
            },
            assistance: {
                guidance: {
                    title: 'Train Arriving',
                    instructions: ['Move away from the platform edge.']
                }
            }
        };
        render(<EmergencyMode observationData={data} />);

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Train Arriving')).toBeInTheDocument();
        expect(screen.getByText('Move away from the platform edge.')).toBeInTheDocument();

        expect(screen.getByText('Observation')).toBeInTheDocument();
        expect(screen.getByText('Provider')).toBeInTheDocument();
        expect(screen.getByText('Topology')).toBeInTheDocument();

        const highElements = screen.getAllByText('HIGH');
        expect(highElements.length).toBe(2);
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
        expect(screen.queryByText(/Call Emergency Services/i)).not.toBeInTheDocument();
    });

    it('renders SOS button when DIAL_EMERGENCY is available', () => {
        const data = {
            awareness: { requiresProminentDisplay: true },
            assistance: {
                guidance: { title: 'Emergency', instructions: [] },
                availableActions: ['DIAL_EMERGENCY'],
                emergencyContact: { number: '112', description: 'Emergency Services' }
            }
        };
        render(<EmergencyMode observationData={data} />);
        const sosButton = screen.getByText('📞 Call Emergency Services');
        expect(sosButton).toBeInTheDocument();
        expect(sosButton).toHaveAttribute('href', 'tel:112');
    });

    it('renders correct background for awareness overlay', () => {
        const data = {
            awareness: { requiresProminentDisplay: true },
            assistance: {
                guidance: { title: 'Test', instructions: [] }
            }
        };
        const { container } = render(<EmergencyMode observationData={data} />);
        expect(container.firstChild).toHaveClass('bg-slate-900/95');
    });
    it('returns null and logs warning if assistance object is missing', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const data = {
            awareness: { requiresProminentDisplay: true }
            // assistance is missing entirely
        };
        const { container } = render(<EmergencyMode observationData={data} />);

        expect(container.firstChild).toBeNull();
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('violates the backend API contract'));
        consoleSpy.mockRestore();
    });

    it('returns null and logs warning if assistance.guidance is missing', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const data = {
            awareness: { requiresProminentDisplay: true },
            assistance: {
                availableActions: [],
                emergencyContact: null
                // guidance is missing
            }
        };
        const { container } = render(<EmergencyMode observationData={data} />);

        expect(container.firstChild).toBeNull();
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('violates the backend API contract'));
        consoleSpy.mockRestore();
    });
});
