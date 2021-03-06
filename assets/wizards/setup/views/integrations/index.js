/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * External dependencies.
 */
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import classnames from 'classnames';

/**
 * Internal dependencies
 */
import { withWizardScreen, Button, Handoff, hooks } from '../../../../components/src';
import * as logos from './logos';
import './style.scss';

const INTEGRATIONS = {
	jetpack: {
		pluginSlug: 'jetpack',
		editLink: 'admin.php?page=jetpack#/settings',
		name: 'Jetpack',
		description: __( 'The ideal plugin for protection, security, and more', 'newspack' ),
		buttonText: __( 'Connect Jetpack', 'newspack' ),
		logo: logos.Jetpack,
		statusFetchHandler: fetchFn =>
			fetchFn( { path: `/newspack/v1/plugins/jetpack` } ).then( result => ( {
				jetpack: { status: result.Configured ? result.Status : 'inactive' },
			} ) ),
	},
	'google-site-kit': {
		pluginSlug: 'google-site-kit',
		editLink: 'admin.php?page=googlesitekit-splash',
		name: 'Google Site Kit',
		description: __(
			'Enables you to deploy, manage, and get insights from critical Google tools',
			'newspack'
		),
		buttonText: __( 'Connect Google Site Kit', 'newspack' ),
		logo: logos.SiteKit,
		statusFetchHandler: fetchFn =>
			fetchFn( { path: '/newspack/v1/plugins/google-site-kit' } ).then( result => ( {
				'google-site-kit': { status: result.Configured ? result.Status : 'inactive' },
			} ) ),
	},
	mailchimp: {
		name: 'Mailchimp',
		description: __( 'Allows users to sign up to your mailing list', 'newspack' ),
		buttonText: __( 'Connect Mailchimp', 'newspack' ),
		logo: logos.Mailchimp,
		statusFetchHandler: async fetchFn => {
			const jetpackStatus = await fetchFn( { path: `/newspack/v1/plugins/jetpack` } );
			if ( ! jetpackStatus.Configured ) {
				return Promise.resolve( {
					mailchimp: { status: 'inactive', error: { code: 'unavailable_site_id' } },
				} );
			}
			return new Promise( resolve => {
				fetchFn( { path: '/wpcom/v2/mailchimp' } )
					.then( result =>
						resolve( {
							mailchimp: {
								url: result.connect_url,
								status: result.code === 'connected' ? 'active' : 'inactive',
							},
						} )
					)
					.catch( error => resolve( { mailchimp: { status: 'inactive', error } } ) );
			} );
		},
		isOptional: true,
	},
};

const intergationConnectButton = integration => {
	if ( integration.pluginSlug ) {
		return (
			<Handoff plugin={ integration.pluginSlug } editLink={ integration.editLink } compact isLink>
				{ integration.buttonText }
			</Handoff>
		);
	}
	if ( integration.url ) {
		return (
			<Button isLink href={ integration.url } target="_blank">
				{ integration.buttonText }
			</Button>
		);
	}
	if ( integration.error?.code === 'unavailable_site_id' ) {
		return (
			<span className="i o-80">{ __( 'Connect Jetpack in order to configure Mailchimp.' ) }</span>
		);
	}
};

const Integrations = ( { setError, updateRoute } ) => {
	const [ integrations, setIntegrations ] = hooks.useObjectState( INTEGRATIONS );
	const integrationsArray = Object.values( integrations );
	useEffect( () => {
		integrationsArray.forEach( async integration => {
			const update = await integration.statusFetchHandler( apiFetch ).catch( setError );
			setIntegrations( update );
		} );
	}, [] );

	const canProceed =
		integrationsArray.filter(
			integration => integration.status !== 'active' && ! integration.isOptional
		).length === 0;
	useEffect( () => {
		updateRoute( { canProceed } );
	}, [ canProceed ] );

	return (
		<div className="mt4">
			{ integrationsArray.map( integration => {
				const isInactive = integration.status === 'inactive';
				const isLoading = ! integration.status;
				return (
					<div
						key={ integration.name }
						className={ classnames( 'cf mb5 newspack__integration__card', {
							'o-50': isLoading,
						} ) }
					>
						<div className="flex fl w-100 w-70-l pr3-l">
							{ isInactive || isLoading ? (
								<div
									className="b--moon-gray ba br-100 pa2"
									style={ { width: '24px', height: '24px' } }
								/>
							) : (
								<CheckCircleIcon className="newspack__integration__card__status" />
							) }
							<div className="pl2">
								<h2>{ integration.name }</h2>
								<div>
									<div>{ integration.description }</div>
									{ isInactive ? intergationConnectButton( integration ) : null }
								</div>
							</div>
						</div>
						<div className="fl w-100 w-30-l mt3 mt0-l pa4 pa4-l ba br2 b--moon-gray newspack__integration__card__logo">
							{ integration.logo() }
						</div>
					</div>
				);
			} ) }
		</div>
	);
};

export default withWizardScreen( Integrations );
