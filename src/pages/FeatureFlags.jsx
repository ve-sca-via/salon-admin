/**
 * FeatureFlags.jsx - Internal feature entitlement control
 *
 * The switchboard for what the client can see. Each feature sits at one of
 * three statuses and flipping one takes effect immediately — no deploy, no
 * migration, no branch merge.
 *
 *   Internal  Built but not sold. Staff can use it in production; the client's
 *             admin panel has no nav item and the API answers 404.
 *   Enabled   The client has it. This is the "they paid" switch.
 *   Disabled  Kill switch. Off for everyone, staff included.
 *
 * INTERNAL STAFF ONLY, and gated on `is_internal` rather than on a feature
 * flag of its own: a flag-managed flags screen would still have to be visible
 * to somebody, and showing the client a list of every unsold feature defeats
 * the entire point. The backend enforces the same via require_internal.
 */

import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useGetAllFeaturesQuery,
  useUpdateFeatureStatusMutation,
} from '../services/api/featureApi';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { PageLoader } from '../components/common/LoadingSpinner';

const STATUSES = [
  {
    value: 'internal',
    label: 'Internal',
    variant: 'warning',
    help: 'Staff only. Hidden from the client, API returns 404.',
  },
  {
    value: 'enabled',
    label: 'Enabled',
    variant: 'success',
    help: 'Live for the client. Use once they have paid.',
  },
  {
    value: 'disabled',
    label: 'Disabled',
    variant: 'danger',
    help: 'Off for everyone, staff included. Kill switch.',
  },
];

const statusMeta = (value) =>
  STATUSES.find((s) => s.value === value) || {
    label: value,
    variant: 'default',
    help: '',
  };

const formatDate = (iso) => {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};

const FeatureFlags = () => {
  const { data, isLoading, isError } = useGetAllFeaturesQuery();
  const [updateStatus] = useUpdateFeatureStatusMutation();

  // Track the key being written so only that row's controls disable.
  const [pendingKey, setPendingKey] = useState(null);

  const features = data?.features || [];

  const handleChange = async (feature, nextStatus) => {
    if (feature.status === nextStatus) return;

    setPendingKey(feature.key);
    try {
      await updateStatus({ key: feature.key, status: nextStatus }).unwrap();
      toast.success(`${feature.name} is now ${statusMeta(nextStatus).label.toLowerCase()}`);
    } catch (err) {
      toast.error(err?.data?.detail || 'Failed to update feature');
    } finally {
      setPendingKey(null);
    }
  };

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <Card title="Feature Flags">
        <p className="text-sm text-gray-600">
          Could not load the feature registry. This page is available to internal
          staff accounts only.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        <p className="mt-1 text-sm text-gray-600">
          Controls which features the client&apos;s admin panel exposes. Changes
          apply immediately.
        </p>
      </div>

      {/* Legend — the three statuses are not self-explanatory from the labels. */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          {STATUSES.map((s) => (
            <div key={s.value} className="flex items-start gap-2">
              <Badge variant={s.variant} size="sm">{s.label}</Badge>
              <p className="text-xs text-gray-600 flex-1">{s.help}</p>
            </div>
          ))}
        </div>
      </Card>

      {features.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-600">
            No features are registered yet. Add a row to{' '}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">feature_flags</code>{' '}
            to gate one.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => {
            const meta = statusMeta(feature.status);
            const isPending = pendingKey === feature.key;
            const enabledOn = formatDate(feature.enabled_at);

            return (
              <Card key={feature.key}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">
                        {feature.name}
                      </h3>
                      <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
                      <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {feature.key}
                      </code>
                    </div>

                    {feature.description && (
                      <p className="mt-1.5 text-sm text-gray-600">
                        {feature.description}
                      </p>
                    )}

                    {enabledOn && (
                      <p className="mt-1.5 text-xs text-gray-500">
                        Handed to the client on {enabledOn}
                      </p>
                    )}
                  </div>

                  {/* Segmented status control */}
                  <div
                    className="inline-flex rounded-lg border border-gray-300 overflow-hidden shrink-0 self-start"
                    role="group"
                    aria-label={`Status for ${feature.name}`}
                  >
                    {STATUSES.map((s) => {
                      const active = feature.status === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => handleChange(feature, s.value)}
                          disabled={isPending}
                          aria-pressed={active}
                          title={s.help}
                          className={[
                            'px-4 py-2 text-sm font-medium transition-colors',
                            'border-r border-gray-300 last:border-r-0',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            active
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeatureFlags;
